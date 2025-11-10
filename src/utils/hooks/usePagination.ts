import { useState } from "react"

export default function usePagination() {
    let [page, setPage] = useState(1);
    let [total, setTotal] = useState(0);
    let [pageSize, setPageSize] = useState(10);

    function showTotal() {
        return `共 ${total} 个记录`;
    }

    function onChange({ page, pageSize }: { page: number, pageSize: number }) {
        if (page < 1) {
            page = 1;
        }
        if (pageSize < 10) {
            pageSize = 10;
        }
        setPage(page);
        setPageSize(pageSize);
    }

    return {
        page, 
        setPage,
        pageSize, 
        setPageSize,
        total, 
        setTotal,
        onChange, 
        showTotal
    }
}