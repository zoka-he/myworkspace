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

            return response.data;
        } catch (error) {
            console.error('Error fetching datasets:', error);
            throw error;
        }
    }
}