import { buttonTypeCheck, getIconNameInButton } from "./components/button";
import componentMapping from './componentMapping';
import * as controller from "./controller";

interface ChildrenComponent {
  component: any[];
  action: any[];
}

let childrenComponent: ChildrenComponent = {
  component: [],
  action: [],
};;

let componentCode: any;
let selectedFrame: SceneNode
const apiUrl = "https://datacore.mvtool.machinevision.global";
const urlMigration = "https://core.mvtool.machinevision.global"
let token: any
let populateResult: any
let dataGET: any

console.clear();
//<!--------------------------------------- FIGMA PLUGIN VIEW UI FIRST  ------------------------------------------->>
figma.showUI(__uiFiles__.main,{ width:700, height: 580, themeColors: false})
figma.skipInvisibleInstanceChildren = true

//<!--------------------------------------- FUNCTION LOGIN  ------------------------------------------->>
async function loginUser(url: string, email: any, password: any) {
  try {
    const response = await fetch(`${url}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'cookie',
        email,
        password,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const res = await response.json();
    token = res;
    // console.log("data token", token.data.access_token);
    figma.ui.postMessage({ type: 'login-success', data: res });
    figma.showUI(__uiFiles__.view, { width: 700, height: 580, themeColors: false });
  } catch (error: any) {
    figma.ui.postMessage({ type: 'login-failed', error: error.toString() });
  }
}

//<!--------------------------------------- FIGMA ON MESSAGE  ------------------------------------------->>
figma.ui.onmessage = async msg => {
  //<!--------------------------------------- TYPE LOGIN  ------------------------------------------->>
  if (msg.type === 'login') {
    loginUser(apiUrl, msg.email, msg.password);
  }
//<!--------------------------------------- SELECT NODE  ------------------------------------------->>
  if (msg.type === 'selectNodeById') {
    const nodeIdToSelect = msg.nodeId;
    selectNodeById(nodeIdToSelect);
  }
//<!--------------------------------------- GET FRAME  ------------------------------------------->>
  if (msg.type === 'getComponentFrameData'){
    const frame = figma.currentPage.selection[0];
    console.log(frame);
    if(frame !== undefined){
        const frameData = {
        id: frame.id,
        name: frame.name
      };
      if(selectedFrame.id !== frame.id) figma.ui.postMessage({ type: 'setComponentFrameData', result: frameData });
      else figma.notify("ID frame conflict");
    } else figma.notify("Frame undefined");
    
    figma.currentPage.selection = [];
  }
//<!--------------------------------------- ANALYS  ------------------------------------------->>
  if (msg.type === 'analyze') {
    const selectedFrame = figma.currentPage.selection[0];
    if (selectedFrame && selectedFrame.type === 'FRAME') {
        childrenComponent.component = [];
        childrenComponent.action = [];
        const parent = getParentElement(selectedFrame);
        inspectChildElement(selectedFrame);
        const allComponents = setComponentGroup();
        const frameData = {
            id: `${figma.fileKey}::::${selectedFrame.id}`,
            file_key: figma.fileKey,
            frame: {
                id: selectedFrame.id,
                name: selectedFrame.name,
            },
            type: getFrameType(selectedFrame),
            feature: parent.feature ? { id: parent.feature.id, name: parent.feature.name } : {},
            page: parent.page ? { id: parent.page.id, name: parent.page.name } : {},
            cluster: parent.cluster ? { id: parent.cluster.id, name: parent.cluster.name } : {},
            module: parent.module ? { id: parent.module.id, name: parent.module.name } : {},
            solution: parent.file ? { id: parent.file.id, name: parent.file.name } : {},
            childrenGroup: allComponents,
        };
        selectedFrame.setPluginData('frameData', JSON.stringify(frameData));
        figma.notify('Analisa selesai. \uD83C\uDF89 Klik Show Data.');
    } else {
        figma.notify('Silakan pilih Frame dulu'); // figma.notify('Please select a Frame');
    }
  }
//<!--------------------------------------- SHOW DATA  ------------------------------------------->>
  if (msg.type === 'showData'){
    selectedFrame = figma.currentPage.selection[0];
    if (selectedFrame && selectedFrame.type === 'FRAME') {
      const syncData = selectedFrame.getPluginData('frameData');
      if (syncData) {        
        let frameData = JSON.parse(syncData);
        let fileKeyData = figma.fileKey
        let dataToken = token.data.access_token
        const staticToken = "tZUjr2tRUjEZHdYhEMOCWQypanPTcfKH"
        figma.notify('Loading...');
        await fetch(`${urlMigration}/figma_frame?name=${selectedFrame.name}&frame_id=${selectedFrame.id}&file_key=${fileKeyData}&token=${dataToken}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          dataGET = data
          let resultDataAction = frameData.childrenGroup.action
          let getDataAction = dataGET.actionButton
          let resultDataComponent = frameData.childrenGroup.component
          let getDataComponent = dataGET.dataComponent
          // let resultDataUserStory = frameData.childrenGroup.userStory
          let getDataUserStory = dataGET.userStory
          // let resultDataDescription = frameData.childrenGroup.detailDescription
          let getDataDescription = dataGET.detailDescription
          let getDataTLComment = dataGET.tComment
          let getDataBAComment = dataGET.baComment
          let getDataManHour = dataGET
          populateResult = { 
             dataAction: loopDataGetNew(getDataAction, resultDataAction),  
             dataComponent: loopDataGetNew(getDataComponent, resultDataComponent),  
             dataUserStory: getDataUserStory,  
             dataDescription: getDataDescription, 
             dataTLComment: getDataTLComment,
             dataBAComment: getDataBAComment,
             dataManHour: getDataManHour
          }
          // console.log("Comp", populateResult.dataManHour)
          figma.ui.postMessage({ type: 'analysisResult', data: {dataGET: data, resultAnalys: frameData, populateResult} });
          figma.notify('Berhasil memuat data. \uD83C\uDF89');
          figma.currentPage.selection = [];
        })
        .catch(error => {
          console.error('Fetch error:', error);
        });
      } else {
        figma.notify('Data tidak ditemukan')
      }
    }else figma.notify('Silakan pilih Frame dulu'); 
  }
//<!--------------------------------------- CHANGE LOG  ------------------------------------------->>
  if (msg.type === 'showChangeLog') {
    figma.showUI(__uiFiles__.changelog,{ width:700, height: 580, themeColors: false})
  }
//<!--------------------------------------- BACK VIEW  ------------------------------------------->>
  if (msg.type === 'backView') {
    figma.showUI(__uiFiles__.view,{ width:700, height: 580, themeColors: false})
  }
//<!--------------------------------------- SUBMIT DATA  ------------------------------------------->>
  if (msg.type === 'submitDataButton') {
    const staticToken = "tZUjr2tRUjEZHdYhEMOCWQypanPTcfKH";
    let dataToken = token.data.access_token
    const endpoint = `${urlMigration}/figma_frame`;
    let requestData: any = {
      token: dataToken,
      id: `${figma.fileKey}::::${selectedFrame.id}`,
      file_key: figma.fileKey,
      nodeId: selectedFrame.id,
      name: selectedFrame.name,
      type: msg.data_group.type,
      man_hour: msg.data_group.man_hour,
      actionButton: { ...msg.data_group.actionButton },
      dataComponent: { ...msg.data_group.dataComponent },
      userStory: { ...msg.data_group.userStory },
      detailDescription: { ...msg.data_group.detailDescription },
      figmaComment: { ...msg.data_group.figmaComment },
      // manHour: { ...msg.data_group.manHour },
    };
    console.log("test data post:", requestData)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      const res:any = await response.json();
      console.log('DataSend:', res);
      msg.data_group = null;
      figma.notify('Data submitted successfully!');
    } catch (error) {
      console.error('DataSend failed:', error);
      msg.data_group = null;
      figma.notify('Submission failed. Please try again.');
    }
  }
  //<!--------------------------------------- DELETE DATA  ------------------------------------------->>
  if (msg.type === 'deleteDataTest') {
    const staticToken = "tZUjr2tRUjEZHdYhEMOCWQypanPTcfKH";
    const endpoint = `${urlMigration}/delete_figma_frame`;
    let requestData: any = {
      token: staticToken,
      id: `${figma.fileKey}::::${selectedFrame.id}`,
      file_key: figma.fileKey,
      nodeId: selectedFrame.id,
    };
    // console.log("test data post:", requestData)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      const res:any = await response.json();
      console.log('DataSend:', res);
      msg.data_group = null;
      requestData = null
      figma.notify('Data delete successfully!');
    } catch (error) {
      console.error('DataSend failed:', error);
      msg.data_group = null;
      requestData = null
      figma.notify('Delete failed. Please try again.');
    }
  }
 
};


//<!--------------------------------------- FUNCTION LOOP  ------------------------------------------->>
function loopDataGetNew(data1: any[], data2: { filter: (arg0: (item: any) => boolean) => { (): any; new(): any; length: number; }; map: (arg0: (itemRes: any) => void) => void; }) {
  let newDataToPatch: any = data1.filter(itemGET => data2.filter(item => item.code === itemGET.code).length > 0);
  let newDataToCreate: any = data2.filter(itemRes => !newDataToPatch.some((item: { code: any; }) => item.code === itemRes.code));
  let newDataToDelete: any = data1.filter(itemGET => data2.filter(item => item.code !== itemGET.code).length > 0);
  const newData = {
    update: newDataToPatch,
    create: newDataToCreate,
    delete: newDataToDelete,
  };
  newData.create.map((item : any) => {
    delete item.id 
    return item;
  })
  return newData;
}
//<!--------------------------------------- SELECT NODE  ------------------------------------------->>
function selectNodeById(nodeId: string): void {
  const selectedNode = figma.getNodeById(nodeId) as SceneNode;
  if (selectedNode) {
    // Select the node
    console.log(selectedNode);
    figma.currentPage.selection = [selectedNode];
    figma.viewport.scrollAndZoomIntoView([selectedNode]);
    figma.viewport.zoom = 2.0;
  } else {
    figma.notify(`Node with ID ${nodeId} not found.`);
    console.error(`Node ID not found: ${nodeId}`);
  }
}
//<!--------------------------------------- GET PARENT  ------------------------------------------->>
function getParentElement(frame: FrameNode): {
  feature: SectionNode | null;
  page: SectionNode | null;
  cluster: SectionNode | null;
  module: SectionNode | null;
  file: PageNode | null;
} 
{
  const featureNode = frame.parent as SectionNode | null;  
  const pageNode = featureNode?.parent as SectionNode | null;
  const clusterNode = pageNode?.parent as SectionNode | null;
  const moduleNode = clusterNode?.parent as SectionNode | null;
  const fileNode = moduleNode?.parent as PageNode | null;
  return {
    feature: (featureNode?.type === "SECTION") ? featureNode : null,
    page: (pageNode?.type === "SECTION") ? pageNode : null,
    cluster: (clusterNode?.type === "SECTION") ? clusterNode : null,
    module: (moduleNode?.type === "SECTION") ? moduleNode : null,
    file: (fileNode?.type === "PAGE") ? fileNode : null,
  };
}

//<!--------------------------------------- INSPECT CHILD ------------------------------------------->>
function inspectChildElement(frame: SceneNode) {
  if (frame.visible) {
    let componentCodeMappingCheck = isSuitableComponent(frame as InstanceNode);
    if (frame.name.startsWith("[]") || (frame.type === "INSTANCE" && (componentCode = componentCodeMappingCheck))) {
      if (componentCode == "[C]") childrenComponent.component.push(frame.id);
      if (componentCode == "[A]") childrenComponent.action.push(frame.id);
    }
    // Check if the node is a container that could have children
    if ('children' in frame) {
      const children = frame.children as readonly SceneNode[];
      for (const child of children) {
        inspectChildElement(child);
      }
    }
  }
}
//<!--------------------------------------- SUITABLE COMPONENT  ------------------------------------------->>
function isSuitableComponent(node: InstanceNode): InstanceNode | String | any { 
  let mappingFound, instanceType: string | undefined;
  if(node.mainComponent){
    instanceType = node.mainComponent.parent?.type;
    mappingFound = componentMapping.find(component => (component.name === node.name) && instanceType === 'COMPONENT_SET');
    return mappingFound !== undefined ? mappingFound.code : false;
  }

}
//<!--------------------------------------- FRAME TYPE  ------------------------------------------->>
function getFrameType(frame:SceneNode): Object | undefined {
  const _frame =  frame.name;
  const typeList: readonly { name: string; code: string }[] = [
    { code: "[D]", name: "Dropdown" },
    { code: "[M]", name: "Modal" },
  ];
  const frameType = typeList.find(item => item.code === _frame.substring(0, 3))?.name;
  return frameType;
}
//<!--------------------------------------- SET COMPONENT GROUP  ------------------------------------------->>
function setComponentGroup(): Object | undefined {
  let componentGroup: any = {
    component: [],
    action: []
  };
  for (var key in childrenComponent) {
    if (key == 'component') {
      for (var index in childrenComponent.component) {   
        const c = figma.getNodeById(childrenComponent.component[index]) as InstanceNode;      
        const baseComponent = c.findChildren(n => n.name === "_BaseField")[0] as InstanceNode;
        let id = c.id;
        let allProps = controller.instancePropertyCheck(c.id, "*");
        if(baseComponent !== undefined) {
          let name = controller.instancePropertyCheck(baseComponent.id, "Label");
          allProps['base'] = controller.instancePropertyCheck(baseComponent.id, "*");
        }else if(c === null){
          // console.log("C is null");
          let name = "c.name";
        }
        controller.setComponentData(id);
        let existingComponent = componentGroup.component.find((comp: { id: any; code: any; name: any; type: any; }) =>  comp.code === controller.componentData.code || (comp.name == controller.componentData.name && comp.type == controller.componentData.type));
        if(!existingComponent){
          componentGroup.component.push({
            // id: controller.componentData.id,
            code: controller.componentData.code,
            name: controller.componentData.name,
            type: controller.componentData.type,
            isRequired: controller.componentData.required,
            draggable: controller.componentData.draggable,
            properties: allProps
          });
        }
      }
    }

    if (key == 'action') {      
      for (var index in childrenComponent.action) {
        let c = figma.getNodeById(childrenComponent.action[index]) as InstanceNode;
        let id = c.id;
        let allProps = controller.instancePropertyCheck(id, "*");
        controller.setComponentData(id);
        // Check if an object with the same name and type already exists
        let existingComponent = componentGroup.action.find((comp: {id: any; code: any; name: any;}) => comp.code === controller.componentData.code);
        if(!existingComponent){
          componentGroup.action.push({
            // id: controller.componentData.id,
            code: controller.componentData.code,
            name: controller.componentData.name,
            page_redirect: controller.componentData.page_redirect,
            alert_prompt: controller.componentData.alert_prompt,
            properties: allProps
          });
        }
      }
    }
  } 
  return componentGroup;
}