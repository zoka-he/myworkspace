export interface EmbedTaskMqData {
    type: string;
    worldview_id?: string;
    document: string;
    fingerprint: string;
}

export interface EmbedTaskData {
    document: string;
    metadata: { 
        fingerprint: string;
        [key: string]: number | string | boolean 
    };
}