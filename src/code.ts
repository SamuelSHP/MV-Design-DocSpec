import { buttonTypeCheck } from "./components/button";
import componentMapping from './componentMapping';

// Make a GET request
// Example function to make a network request using fetch from Figma Docs
// async function makeNetworkRequest() {
//   const url = 'https://jsonplaceholder.typicode.com/todos/1';

//   try {
//     const response = await fetch(url,{});

//     if (!response.ok) throw new Error(`Network request failed with status ${response.status}`); 
//     const data = await response.json();
//     // console.log('Data:', data);
//   } catch (error) {
//     // console.error('Error:');
//   }
// }

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
figma.showUI(__html__,{ width:700, height: 580, themeColors: false})
figma.skipInvisibleInstanceChildren = true

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = msg => {

  if (msg.type === 'selectNodeById') {
    const nodeIdToSelect = msg.nodeId;
    selectNodeById(nodeIdToSelect);
  }
    
  if (msg.type === 'analyze') {
    const selectedFrame = figma.currentPage.selection[0];
    if (selectedFrame && selectedFrame.type === 'FRAME') {
      // Reset
      childrenComponent.component = [];
      childrenComponent.action = [];

      const parent = getParentElement(selectedFrame);
      inspectChildElement(selectedFrame);

      const frameData: Object = {
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
        childrenGroup:  setComponentGroup() //childrenComponent
      }
      selectedFrame.setPluginData('frameData', JSON.stringify(frameData));
      figma.notify('Analyze done! \uD83C\uDF89 Click Show Data.');
    }else figma.notify('Please select a Frame');
  }

  if (msg.type === 'showData'){
    const selectedFrame = figma.currentPage.selection[0];
    if (selectedFrame && selectedFrame.type === 'FRAME') {
      const syncData = selectedFrame.getPluginData('frameData');
    
      if (syncData) {
  
        let syncDataJSON = JSON.parse(syncData);
        console.log(syncDataJSON);
        
        figma.ui.postMessage({ type: 'analysisResult', result: syncDataJSON });

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
} 
{

  const featureNode = frame.parent as SectionNode | null;  
  const pageNode = featureNode?.parent as SectionNode | null;
  const clusterNode = pageNode?.parent as SectionNode | null;
  const moduleNode = clusterNode?.parent as SectionNode | null;

  return {
    feature: (featureNode?.type === "SECTION") ? featureNode : null,
    page: (pageNode?.type === "SECTION") ? pageNode : null,
    cluster: (clusterNode?.type === "SECTION") ? clusterNode : null,
    module: (moduleNode?.type === "SECTION") ? moduleNode : null,
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

function ceklagi(node: SceneNode) {
  return true;
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
        
        let name = instancePropertyCheck(c, "Label");
        let type = c.componentProperties.Type.value;
        
        if(baseComponent !== undefined) {
          name = instancePropertyCheck(baseComponent, "Label")
        }else if(c === null){
          console.log("C is null")
          name = "c.name";
        }

        let isRequired = (baseComponent !== undefined) ? instancePropertyCheck(baseComponent, "Required", 'BOOLEAN') : null;
        let Other = null;

        // Check if an object with the same name and type already exists
        const existingComponent = componentGroup.component.find((comp: { name: any; type: any; }) => comp.name === name && comp.type === type);

        if(!existingComponent){
          componentGroup.component.push({
            id: c.id,
            name: name,
            type: type,
            isRequired: isRequired ? "Required" : "-"
          });
        }
        // componentGroup.component.push(c.id+"-"+Type);
      }
    }

    if (key == 'action') {      
      for (var index in childrenComponent.action) {
        let c = figma.getNodeById(childrenComponent.action[index]) as InstanceNode;      
        let name = c.name;
        let redirect = null;
        let btnLabel = instancePropertyCheck(c, "Label");
        // console.log("Component is", c);
        buttonTypeCheck(c, "Icon Text");
        // instancePropertyCheck(c, "Label");
        
        // console.log(instancePropertyCheck(c, "Icon Name"));

        // Check if an object with the same name and type already exists
        const existingComponent = componentGroup.action.find((comp: { name: any; type: any; }) => comp.name === btnLabel+' '+name);
        
        if(!existingComponent){
          componentGroup.action.push({
            id: c.id,
            name: btnLabel+' '+name,
            redirect: redirect
          });
        }

        // componentGroup.action.push(c.id+"-"+Name);
        
      }
    }
  } 
  return componentGroup;
}

// // Function to filter instances based on criteria
function instancePropertyCheck(instance: InstanceNode, propertyName: string, propertyType: string = 'TEXT', returnValue: Boolean = true): any {

  // Property -> (Name, Type, Value)
  for (const propName in instance.componentProperties) {
    
    const propertyItem = instance.componentProperties[propName];
    // Create a regex pattern to match variations of the prop name
    const pattern = new RegExp(`${propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[#]\\d{1,}`, "i");

    if(propName.match(pattern) && propertyItem.type === propertyType){
      if (returnValue) return propertyItem.value;
      else return null;
    }
    
  }

  return null;

} 