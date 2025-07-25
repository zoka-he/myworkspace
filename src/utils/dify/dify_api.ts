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

        console.log('dify服务地址', this.serverUrl);
        console.log('查询dataset的apikey', this.apiKey);
        console.log('页码', page);
        console.log('每页数量', limit);

        try {
            const response = await fetch(`${this.serverUrl}/datasets`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                params: {
                    page,
                    limit
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

    async getDocumentList(datasetId: string, page: number = 1, limit: number = 20, keyword: string = '') {
        try {   
            let params: any = {
                page,
                limit
            };

            if (keyword) {
                params.keyword = keyword;
            }

            const response = await fetch.get(
                `${this.serverUrl}/datasets/${datasetId}/documents`, 
                { 
                    headers: { 
                        'Authorization': `Bearer ${this.apiKey}` 
                    },
                    params
                }
            );

            if (response.status >= 400) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error getting document list:', error);
            throw error;
        }
    }

    async getDocumentContent(datasetId: string, documentId: string) {
        try {
            const response = await fetch.get(
                `${this.serverUrl}/datasets/${datasetId}/documents/${documentId}/segments`,
                { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
            );

            if (response.status >= 400) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error getting document content:', error);
            throw error;
        }
    }

    // 自定义文档策略，疑似要付费使用
    // private documentStrategy = {
    //     mode: 'custom',
    //     rules: {
    //         "pre_processing_rules": [
    //             {
    //                 "enabled": false,
    //                 "id": 'remove_extra_spaces'
    //             },
    //             {
    //                 "enabled": false,
    //                 "id": 'remove_urls_emails'
    //             }
    //         ],
    //         "segmentation": {
    //             "saperator": "\n\n",
    //             "max_tokens": 2500
    //         },
    //         "parent_mode": "paragraph",
    //         "subchunk_segmentation": {
    //             "separator": "@@@",
    //             "max_tokens": 2500
    //         }
    //     }
    // }

    private documentStrategy = {
        mode: 'automatic'
    }

    async createDocument(datasetId: string, title: string, content: string) {
        try {
            const response = await fetch.post(
                `${this.serverUrl}/datasets/${datasetId}/document/create-by-text`,
                { 
                    name: title, 
                    text: content,
                    indexing_technique: 'high_quality',
                    process_rule: this.documentStrategy
                },
                { headers: { 
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                } }   
            );

            if (response.status >= 400) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error creating document:', error);
            throw error;
        }
    }

    async updateDocument(datasetId: string, documentId: string, title: string, content: string) {
        try {
            const response = await fetch.post(
                `${this.serverUrl}/datasets/${datasetId}/documents/${documentId}/update-by-text`,
                { name: title, text: content },
                { headers: { 
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                } }   
            );

            if (response.status >= 400) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error updating document:', error);
            throw error;
        }
    }

    async deleteDocument(datasetId: string, documentId: string) {
        try {
            const response = await fetch.delete(    
                `${this.serverUrl}/datasets/${datasetId}/documents/${documentId}`,
                { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
            );
            
            return response.data;            
        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    }


}