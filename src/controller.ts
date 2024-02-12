import * as button from "./components/button";
import * as cell from "./components/table";
// import * as field from "./components/field";

interface ComponentData {
    id: string;
    code: string | null;
    name : string;
    type: string | any;
    required?: boolean;
    draggable?: boolean;
    page_redirect?: string | null;
    alert_prompt?: string | null;
}

// export function main(componentID: string): Object{
//     return setComponentData(componentID, );
// }
export let componentData: ComponentData = {
    id: "",
    code: "",
    name : "",
    type: "",
}

export function setComponentData(componentID: string): Object {
    let setName = getComponentSetName(componentID);
    

    let _componentNode = componentNode(componentID);
    componentData.id = componentID;
    componentData.code = (componentID.split(";").length > 1 ) ? componentID.split(";")[1] : componentID.split(";")[0];
    
    switch (setName) {

        case 'button':   
            componentData.name = (button.buttonTypeCheck(componentNode(componentID), "Icon Only")) ? button.getIconNameInButton(componentNode(componentID)) : instancePropertyCheck(componentID, "Edit Text");
            componentData.type = "Button";
            componentData.page_redirect = null;
            componentData.alert_prompt = null;
        break;
        
        case 'field':
            let baseComponent = _componentNode.findChildren(n => n.name === "_BaseField")[0] as InstanceNode;

            componentData.name = instancePropertyCheck(baseComponent.id, "Label");
            componentData.type = _componentNode.componentProperties.Type.value as string;
            componentData.required = (baseComponent !== undefined) ? instancePropertyCheck(baseComponent.id, "Required", 'BOOLEAN') : false;
            componentData.draggable = false;
        break;

        case 'cell':
            componentData.name = cell.getColumnGroupName(_componentNode);
            componentData.type = _componentNode.componentProperties.Type.value;
        break;
    
        default:
            break;
    }    

    return componentData
}

export function instancePropertyCheck(id: string, propertyName: string, propertyType: string = 'TEXT', returnValue: Boolean = true): any {
    let instance = componentNode(id);
    let allProps: { [key: string]: any }  = {};
    // Property -> (Name, Type, Value)
    for (let propName in instance.componentProperties) {
  
      let propertyValueType = instance.componentProperties[propName];
      if(propertyName !== "*"){
        let refinedPropName = propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Create a regex pattern to match variations of the prop name
        let pattern = new RegExp(refinedPropName, "i");
  
        if(propName.match(pattern) && propertyValueType.type === propertyType) return propertyValueType.value;
        else instance.parent?.name;
  
      } else allProps[propName] =  propertyValueType.value;  
      
    }
  
    return allProps;
    
  }
  
function getMasterComponentProps(instance: InstanceNode) {
return instance.mainComponent?.name;
}

function componentNode(componentID: string): InstanceNode{
    return figma.getNodeById(componentID) as InstanceNode;
}

function getComponentSetName(componentID: string): string{
    let component = componentNode(componentID);
    let componentSetName = component.mainComponent?.parent?.name.toLowerCase() as string;
    return componentSetName;
}