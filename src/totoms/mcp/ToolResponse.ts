
export interface ToolResponseContent {
    type: "text";
    text?: string; // For type "text"
}

export interface ToolResponse {
    content: ToolResponseContent[];
}