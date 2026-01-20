export interface EmbedTaskMqData {
    type: string;
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