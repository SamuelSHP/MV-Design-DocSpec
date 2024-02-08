import { buttonTypeCheck, getIconNameInButton } from "./components/button";
import componentMapping from './componentMapping';
import * as controller from "./controller";
import { all } from "axios";

// Make a GET request
// Example function to make a network request using fetch from Figma Docs
async function makeNetworkRequest(filekey: String, node_id: String) {
  const url = 'https://data-migration.machinevision.global/figma_frame?token=ycn-_GnCGhmtpxSNIQ8Nmy7aG8EQTCt9&file_key='+filekey+'&node_id='+node_id;

  try {
    const response = await fetch(url,{});

    if (!response.ok) throw new Error(`Network request failed with status ${response.status}`); 
    const data = await response.json();
    console.log('Data:', data);
  } catch (error) {
    console.error('Error:');
  }
}

interface ChildrenComponent {
  component: any[];
  action: any[];
}

let childrenComponent: ChildrenComponent = {
  component: [],
  action: [],
};;

let componentCode: any;

// ------------------------------------

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).
console.clear();
// This shows the HTML page in "ui.html".
figma.showUI(__uiFiles__.main,{ width:700, height: 580, themeColors: false})
figma.skipInvisibleInstanceChildren = true

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = msg => {

  if (msg.type === 'selectNodeById') {
    const nodeIdToSelect = msg.nodeId;
    selectNodeById(nodeIdToSelect);

  }

  if (msg.type === 'getComponentFrameData'){
    const selectedFrame = figma.currentPage.selection[0];
    const frame = {
      id: selectedFrame.id,
      name: selectedFrame.name
    };
    
    figma.ui.postMessage({ type: 'setComponentFrameData', result: frame });
  }
    
  if (msg.type === 'analyze') {
    const selectedFrame = figma.currentPage.selection[0];
    if (selectedFrame && selectedFrame.type === 'FRAME') {
      // Reset
      childrenComponent.component = [];
      childrenComponent.action = [];

      const parent = getParentElement(selectedFrame);
      inspectChildElement(selectedFrame);

      // Collect Component dari Proses Inspect
      let allComponents = setComponentGroup();

      const frameData: Object = {
        id: figma.fileKey+"::::"+selectedFrame.id,
        file_key: figma.fileKey,
        frame: {
          id: selectedFrame.id,
          name: selectedFrame.name,
        },
        type: getFrameType(selectedFrame),
        feature: {
          id: parent.feature?.id,
          name: parent.feature?.name,
        },
        page : {
          id: parent.page?.id,
          name: parent.page?.name,
        },
        cluster : {
          id: parent.cluster?.id,
          name: parent.cluster?.name,
        },
        module : {
          id: parent.module?.id,
          name: parent.module?.name,
        },
        solution: {
          id: parent.file?.id,
          name: parent.file?.name
        },
        childrenGroup:  allComponents //childrenComponent
      }
      console.log(childrenComponent);
      selectedFrame.setPluginData('frameData', JSON.stringify(frameData));
      figma.notify('Analyze done! \uD83C\uDF89 Click Show Data.');
    }else figma.notify('Please select a Frame');
  }

  if (msg.type === 'showData'){
    const selectedFrame = figma.currentPage.selection[0];
    if (selectedFrame && selectedFrame.type === 'FRAME') {
      const syncData = selectedFrame.getPluginData('frameData');
    
      if (syncData) {        
        let frameData = JSON.parse(syncData);
        
        // Output Test
        console.log(frameData);
        
        figma.ui.postMessage({ type: 'analysisResult', result: frameData });

      } else {
        figma.notify('No data found')
      }
    }else figma.notify('Please select a Frame'); 

  }
  
  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  // figma.closePlugin();
};

function selectNodeById(nodeId: string): void {
  const selectedNode = figma.getNodeById(nodeId);

  if (selectedNode) {
    // Select the node
    figma.viewport.scrollAndZoomIntoView([selectedNode]);
    figma.viewport.zoom = 2.0;
  } else {
    figma.notify(`Node with ID ${nodeId} not found.`);
    console.error(`Node ID not found: ${nodeId}`);
  }
}

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

// Function to get elements inside a frame
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

function isSuitableComponent(node: InstanceNode): InstanceNode | String | any { 
  let mappingFound, instanceType: string | undefined;
  
  if(node.mainComponent){
    instanceType = node.mainComponent.parent?.type;
    mappingFound = componentMapping.find(component => (component.name === node.name) && instanceType === 'COMPONENT_SET');
    return mappingFound !== undefined ? mappingFound.code : false;
  }

}

function getFrameType(frame:SceneNode): Object | undefined {
  
  const _frame =  frame.name;
  const typeList: readonly { name: string; code: string }[] = [
    { code: "[D]", name: "Dropdown" },
    { code: "[M]", name: "Modal" },
  ];
  const frameType = typeList.find(item => item.code === _frame.substring(0, 3))?.name;

  return frameType;
}

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
          console.log("C is null");
          let name = "c.name";
        }


        // Check if an object with the same name and type already exists
        controller.setComponentData(id);
        let existingComponent = componentGroup.component.find((comp: { id: any; refinedID: any; name: any; type: any; }) =>  comp.refinedID === controller.componentData.refinedID || (comp.name == controller.componentData.name && comp.type == controller.componentData.type));

        if(!existingComponent){
          componentGroup.component.push({
            id: controller.componentData.id,
            refinedID: controller.componentData.refinedID,
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
        let existingComponent = componentGroup.action.find((comp: {id: any; refinedID: any; name: any;}) => comp.refinedID === controller.componentData.refinedID);

        if(!existingComponent){
          componentGroup.action.push({
            id: controller.componentData.id,
            refinedID: controller.componentData.refinedID,
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