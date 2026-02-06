import axios from "axios";

const fetch = axios.create({
    timeout: 5 * 60 * 1000 // 5 minutes in milliseconds
});


export default class DifyApi {
    private serverUrl: string;

    constructor(serverUrl: string = 'http://localhost/v1') {
        this.serverUrl = serverUrl;
    }

    /**
     * 拉取知识库列表
     * @param page 
     * @param limit 
     * @returns 
     */
    async getDatasets(apiKey: string, page: number = 1, limit: number = 20) {

        console.log('dify服务地址', this.serverUrl);
        console.log('查询dataset的apikey', apiKey);
        console.log('页码', page);
        console.log('每页数量', limit);

        try {
            const response = await fetch(`${this.serverUrl}/datasets`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
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

    async queryDataset(apiKey: string, datasetId: string, query: string) {
        try {
            const response = await fetch.post(
                `${this.serverUrl}/datasets/${datasetId}/retrieve`, 
                { query },
                { headers: { 'Authorization': `Bearer ${apiKey}` } }
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

    async getDocumentList(apiKey: string, datasetId: string, page: number = 1, limit: number = 20, keyword: string = '') {
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
                        'Authorization': `Bearer ${apiKey}` 
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

    async getDocumentContent(apiKey: string, datasetId: string, documentId: string) {
        try {
            const response = await fetch.get(
                `${this.serverUrl}/datasets/${datasetId}/documents/${documentId}/segments`,
                { headers: { 'Authorization': `Bearer ${apiKey}` } }
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

    async createDocument(apiKey: string, datasetId: string, title: string, content: string) {
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
                    'Authorization': `Bearer ${apiKey}`,
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

    async updateDocument(apiKey: string, datasetId: string, documentId: string, title: string, content: string) {
        try {
            const response = await fetch.post(
                `${this.serverUrl}/datasets/${datasetId}/documents/${documentId}/update-by-text`,
                { name: title, text: content },
                { headers: { 
                    'Authorization': `Bearer ${apiKey}`,
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

    async deleteDocument(apiKey: string, datasetId: string, documentId: string) {
        try {
            const response = await fetch.delete(    
                `${this.serverUrl}/datasets/${datasetId}/documents/${documentId}`,
                { headers: { 'Authorization': `Bearer ${apiKey}` } }
            );
            
            return response.data;            
        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    }

    /**
     * 直接调用 Dify 应用（工作流），同步阻塞直到返回
     * @param appKey 目标应用的 API Key（在 Dify 应用设置中获取）
     * @param inputs 应用入参，键值对，与工作流中定义的变量对应
     * @param options 可选：user 用户标识；responseMode 响应模式，默认 blocking
     * @returns 应用执行结果的 outputs 对象
     */
    async runApp(
        appKey: string,
        inputs: Record<string, any>,
        options?: { user?: string; responseMode?: 'blocking' | 'streaming' }
    ): Promise<Record<string, any>> {
        try {
            const body = this.buildAgentRequest(inputs, {
                responseMode: options?.responseMode ?? 'blocking',
                user: options?.user ?? 'dify-api-client'
            });
            const response = await fetch.post(
                `${this.serverUrl}/workflows/run`,
                body,
                {
                    headers: {
                        'Authorization': `Bearer ${appKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return this.unwrapAgentResponse(response.data);
        } catch (error) {
            console.error('Error running Dify app:', error);
            throw error;
        }
    }

    /**
     * 根据输入的 Object 构建 dify agent 调用的请求体
     * @param inputs 输入的参数对象
     * @param options 可选配置
     * @param options.responseMode 响应模式，默认为 'blocking'
     * @param options.user 用户标识，默认为 'dify-api-client'
     * @returns 构建好的请求体
     */
    buildAgentRequest(
        inputs: Record<string, any>,
        options?: {
            responseMode?: 'blocking' | 'streaming';
            user?: string;
        }
    ) {
        return {
            inputs,
            response_mode: options?.responseMode || 'blocking',
            user: options?.user || 'dify-api-client'
        };
    }

    /**
     * 对 dify agent 的返回进行拆包，暴露返回的 Object
     * @param response dify agent 的响应数据
     * @returns 拆包后的输出对象，如果失败则抛出错误
     */
    unwrapAgentResponse(response: {
        data?: {
            outputs?: Record<string, any>;
            status?: string;
            error?: string;
        };
        workflow_run_id?: string;
    }): Record<string, any> {
        const data = response?.data;
        
        if (!data) {
            throw new Error('Invalid response: missing data field');
        }

        const status = data.status;
        const error = data.error;

        if (status === 'failed' || error) {
            throw new Error(error || 'Dify agent execution failed');
        }

        const outputs = data.outputs;
        
        if (!outputs) {
            throw new Error('Invalid response: missing outputs field');
        }

        return outputs;
    }

}