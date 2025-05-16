import axios from "axios";

const fetch = axios.create({
    timeout: 5 * 60 * 1000 // 5 minutes in milliseconds
});


export default class DifyApi {
    private apiKey: string;
    private serverUrl: string;

    constructor(apiKey: string = 'dataset-CND54hW0XBgB1UTOA5ZB9xjr', serverUrl: string = 'http://localhost/v1') {
        this.apiKey = apiKey;
        this.serverUrl = serverUrl;
    }

    /**
     * 拉取知识库列表
     * @param page 
     * @param limit 
     * @returns 
     */
    async getDatasets(page: number = 1, limit: number = 20) {
        try {
            const response = await fetch(`${this.serverUrl}/datasets?page=${page}&limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (response.status >= 400) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const datasetInfo = response.data.data;

            if (!datasetInfo || !Array.isArray(datasetInfo)) {
                throw new Error('Invalid response format');
            }
            return datasetInfo;
        } catch (error) {
            console.error('Error fetching datasets:', error);
            throw error;
        }
    }

    async queryDataset(datasetId: string, query: string) {
        try {
            const response = await fetch.post(
                `${this.serverUrl}/datasets/${datasetId}/retrieve`, 
                { query },
                { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
            );

            if (response.status >= 400) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error querying dataset:', error);
            throw error;
        }
    }

    // async getWorkflows() {
    //     try {
    //         const response = await fetch.get(`${this.serverUrl}/workflows`, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
    //     }
    // }

    // async runWorkflow(workflowId: string, input: any) {
    //     try {
    //         const response = await fetch.post(
    //             `${this.serverUrl}/workflows/${workflowId}/info`, 
    //             { input }, 
    //             { headers: { 'Authorization': `Bearer ${this.apiKey}` } 
    //         });

    //         if (response.status >= 400) {
    //             throw new Error(`HTTP error! status: ${response.status}`);
    //         }

    //         return response.data;
    //     } catch (error) {
    //         console.error('Error running workflow:', error);
    //         throw error;
    //     }
    // }


}