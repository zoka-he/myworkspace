const ports = new Set();

const state = {
    lastWriteCompleted: null,
    lastEventEditRequest: null,
};

function broadcast(message) {
    ports.forEach((port) => {
        try {
            port.postMessage(message);
        } catch (error) {
            // Ignore broken ports.
        }
    });
}

function handleMessage(port, message) {
    if (!message || typeof message !== 'object') return;
    const type = message.type;

    if (type === 'GET_STATE') {
        port.postMessage({ type: 'STATE_SYNC', payload: state });
        return;
    }

    if (type === 'WRITE_COMPLETED') {
        state.lastWriteCompleted = {
            ...(message.payload || {}),
            timestamp: Date.now(),
        };
        broadcast({ type: 'WRITE_COMPLETED', payload: state.lastWriteCompleted });
        return;
    }

    if (type === 'REQUEST_EVENT_EDIT') {
        state.lastEventEditRequest = {
            ...(message.payload || {}),
            timestamp: Date.now(),
        };
        broadcast({ type: 'EVENT_EDIT_REQUESTED', payload: state.lastEventEditRequest });
    }
}

self.onconnect = (event) => {
    const port = event.ports[0];
    ports.add(port);
    port.start();

    port.onmessage = (msgEvent) => {
        handleMessage(port, msgEvent.data);
    };

    port.onmessageerror = () => {
        ports.delete(port);
    };

    port.postMessage({ type: 'STATE_SYNC', payload: state });
};
