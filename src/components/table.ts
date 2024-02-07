export function getColumnGroupName(dataCellInstance: InstanceNode, mode: string = "*"): string {

    let contentHeader = "";
    let header: InstanceNode;
    let selectedHeader: BaseNode;

    switch (mode) {
        case 'by row':
            // Temuin dulu rownya dia
            let row = dataCellInstance.parent;

            // Dari row itu tadi, cek ada di posisi berapa cell itu.
            let cellPosition = row?.children.findIndex(item => item.id === dataCellInstance.id) as number;

            // Cari Header dari Table
            let headerRow = row?.parent?.findChild(child => (child.name === "Header Row")) as FrameNode;

            header = headerRow.children[cellPosition] as InstanceNode;
            selectedHeader = header.findChild(child => (child.type === "TEXT" || child.type === "INSTANCE")) as BaseNode;

            break;
    
        default:
            header = dataCellInstance.parent?.children[0] as InstanceNode;
            selectedHeader = header.findChild(child => (child.type === "TEXT" || child.type === "INSTANCE")) as BaseNode;
            console.log(selectedHeader);
            break;
    }

    if (selectedHeader?.type === "TEXT"){
        contentHeader = selectedHeader.characters
    }else if(selectedHeader === null){
        contentHeader = "Action";
    }else{
        contentHeader = selectedHeader.name;
    }
    
    return contentHeader;
}