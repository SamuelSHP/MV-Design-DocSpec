export function buttonTypeCheck(button: InstanceNode, type: String): any {
    if (getType(button) === type) return button.findChild(node => node.id !== null);
}

function getType(button: InstanceNode) {
    for (const property in button.componentProperties) {
        if (property == "Type") { return (button.componentProperties['Type'].value); }
    }
}
export function getIconNameInButton(button: InstanceNode): string | undefined {
    return button.findChild(node => node.id !== null)?.name;
}