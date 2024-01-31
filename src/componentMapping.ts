interface FigmaMappingComponent {
    name: string;
    level? : "Atomic" | "Molecule"; 
    code: string; // [M], [C], [A],
    properties: [];
    }
const componentCodeMapping: FigmaMappingComponent[] = [
    { name: "Button", level: "Atomic", code: "[A]", properties: [] },
    { name: "Field", level: "Molecule", code: "[C]", properties: [] },
    { name: "Toggle", level: "Atomic", code: "[C]", properties: [] },
    { name: "Cell", level: "Molecule", code: "[C]", properties: [] }
    // { name: "Input", code: "[C]" } -> Error.
];

export default componentCodeMapping;