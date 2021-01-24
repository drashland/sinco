export namespace DOM {
  export interface getDocument {
    root: {
      nodeId: number,
      backendNodeId: number,
      nodeType: number,
      nodeName: string
      localName: "",
      nodeValue: ""
      childNodeCount: number,
      children: Array<{
        nodeId: number,
        parentId: number,
        backendNodeId: number,
        nodeType: number,
        nodeName: string,
        localName: string,
        nodeValue: string,
        publicId?: string,
        systemId?: string,
        childNodeCount?: number,
        children?: unknown[],
        attributes?: unknown[],
        frameId?: string
      }>,
      documentURL: string;
      baseURL: string,
      xmlVersion: string
    };
  }
}