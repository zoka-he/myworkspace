import { NextApiRequest, NextApiResponse } from 'next';

export type ApiError = {
    message: string;
    statusCode?: number;
    error?: any;
};

export function withErrorHandler(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        try {
            await handler(req, res);
        } catch (error: any) {
            console.error('API error:', error);
            
            const statusCode = error.statusCode || 500;
            const message = error.message || 'Internal server error';
            
            res.status(statusCode).json({
                message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    };
}

export function createApiError(message: string, statusCode: number = 500, error?: any): ApiError {
    return {
        message,
        statusCode,
        error
    };
} 