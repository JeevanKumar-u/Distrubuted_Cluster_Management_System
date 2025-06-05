import axios from "axios";

const API_URL = "http://localhost:5000";

// Fetch all nodes
export const getNodes = async () => {
    const res = await axios.get(`${API_URL}/list_nodes`);
    return res.data;
};

// Add a node
export const addNode = async (node_id, cpu_cores) => {
    const res = await axios.post(`${API_URL}/add_node`, { node_id, cpu_cores });
    return res.data;
};

// Remove a node
export const removeNode = async (node_id) => {
    const res = await axios.delete(`${API_URL}/remove_node/${node_id}`);
    return res.data;
};

// Check node health
export const healthCheck = async () => {
    const res = await axios.get(`${API_URL}/health_check`);
    return res.data;
};

// Restart an unhealthy node
export const restartNode = async (node_id) => {
    const res = await axios.post(`${API_URL}/restart_node/${node_id}`);
    return res.data;
};


export const deployPod = async (pod_id, cpu_required, strategy, node_id) => {
    const res = await axios.post(`${API_URL}/deploy_pod`, { 
        pod_id, 
        cpu_required, 
        strategy,
        node_id 
    });
    return res.data;
};

export const getPods = async () => {
    const res = await axios.get(`${API_URL}/list_pods`);
    return res.data;
};

// Add these functions to your existing api.js file
export const getSystemStatus = async () => {
    const res = await axios.get(`${API_URL}/system_status`);
    return res.data;
  };
  
  export const triggerHeartbeat = async (node_id, fail_pods = []) => {
    const res = await axios.post(`${API_URL}/trigger_heartbeat/${node_id}`, { fail_pods });
    return res.data;
  };
  
  export const deletePod = async (pod_id) => {
    const res = await axios.delete(`${API_URL}/delete_pod/${pod_id}`);
    return res.data;
  };

  // In frontend/src/lib/api.js
export const refreshAllNodes = async () => {
    const res = await axios.post(`${API_URL}/refresh_all_nodes`);
    return res.data;
  };

  export const markNodeUnhealthy = async (node_id) => {
    const res = await axios.post(`${API_URL}/mark_node_unhealthy/${node_id}`);
    return res.data;
  };