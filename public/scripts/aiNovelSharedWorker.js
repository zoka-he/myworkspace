const ports = new Set();
/** @type {Map<MessagePort, string | null>} */
const portRoles = new Map();

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

function countEventManage2Tabs() {
    let n = 0;
    ports.forEach((port) => {
        if (portRoles.get(port) === 'eventManage2') {
            n += 1;
        }
    });
    return n;
}

function handleMessage(port, message) {
    if (!message || typeof message !== 'object') return;
    const type = message.type;

    if (type === 'REGISTER_TAB') {
        const role = message.payload && message.payload.role;
        portRoles.set(port, typeof role === 'string' ? role : null);
        return;
    }

    if (type === 'UNREGISTER_TAB') {
        portRoles.set(port, null);
        return;
    }

    if (type === 'GET_EVENT_MANAGE2_TAB_COUNT') {
        const requestId = message.requestId;
        port.postMessage({
            type: 'EVENT_MANAGE2_TAB_COUNT_RESULT',
            requestId,
            count: countEventManage2Tabs(),
        });
        return;
    }

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
        return;
    }
}

self.onconnect = (event) => {
    const port = event.ports[0];
    ports.add(port);
    portRoles.set(port, null);
    port.start();

    port.onmessage = (msgEvent) => {
        handleMessage(port, msgEvent.data);
    };

    port.onmessageerror = () => {
        ports.delete(port);
        portRoles.delete(port);
    };

    port.postMessage({ type: 'STATE_SYNC', payload: state });
};
