// "use client";
// import { useEffect, useState } from "react";
// import { getSystemStatus, triggerHeartbeat,markNodeUnhealthy } from "@/lib/api";
// import { ToastContainer, toast } from "react-toastify";
// import { refreshAllNodes } from "@/lib/api";
// import "react-toastify/dist/ReactToastify.css";

// export default function Monitoring() {
//   const [systemStatus, setSystemStatus] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshInterval, setRefreshInterval] = useState(5); // in seconds
//   const [selectedNode, setSelectedNode] = useState(null);
//   const [failingPods, setFailingPods] = useState([]);

//   useEffect(() => {
//     fetchSystemStatus();
//     const interval = setInterval(fetchSystemStatus, refreshInterval * 1000);
    
//     return () => clearInterval(interval);
//   }, [refreshInterval]);

//   const fetchSystemStatus = async () => {
//     try {
//       setLoading(true);
//       const data = await getSystemStatus();
//       setSystemStatus(data);
//     } catch (error) {
//       console.error("Failed to fetch system status:", error);
//       toast.error("Failed to fetch system status");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleRefreshAllNodes = async () => {
//     try {
//       setLoading(true);
//       await refreshAllNodes();
//       toast.success("All nodes refreshed");
//       await fetchSystemStatus();
//     } catch (error) {
//       console.error("Failed to refresh nodes:", error);
//       toast.error("Failed to refresh nodes");
//     } finally {
//       setLoading(false);
//     }
//   };
//   const handleTriggerHeartbeat = async () => {
//     if (!selectedNode) {
//       toast.warning("Please select a node");
//       return;
//     }

//     try {
//       await triggerHeartbeat(selectedNode, failingPods);
//       toast.success(`Heartbeat sent for node ${selectedNode}`);
      
//       // Clear selections
//       setFailingPods([]);
      
//       // Refresh status immediately
//       fetchSystemStatus();
//     } catch (error) {
//       console.error("Failed to trigger heartbeat:", error);
//       toast.error("Failed to trigger heartbeat");
//     }
//   };

//   const togglePodFailure = (pod_id) => {
//     if (failingPods.includes(pod_id)) {
//       setFailingPods(failingPods.filter(id => id !== pod_id));
//     } else {
//       setFailingPods([...failingPods, pod_id]);
//     }
//   };

//   // Add this function to your Monitoring component
// const handleMarkNodeUnhealthy = async (node_id) => {
//   if (!window.confirm(`Are you sure you want to mark node ${node_id} as unhealthy? This will reschedule all its pods to other healthy nodes.`)) {
//     return;
//   }
  
//   try {
//     setLoading(true);
//     const result = await markNodeUnhealthy(node_id);
//     toast.success(`Node ${node_id} marked as unhealthy. ${result.rescheduled_pods} pods rescheduled.`);
//     await fetchSystemStatus();
//   } catch (error) {
//     console.error("Failed to mark node as unhealthy:", error);
//     toast.error(error.response?.data?.error || "Failed to mark node as unhealthy");
//   } finally {
//     setLoading(false);
//   }
// };
//   const getTimeAgo = (timestamp) => {
//     if (!timestamp) return "Never";
    
//     const seconds = Math.floor((Date.now() - timestamp) / 1000);
//     if (seconds < 60) return `${seconds} seconds ago`;
//     if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
//     return `${Math.floor(seconds / 3600)} hours ago`;
//   };

//   return (
//     <div className="min-h-screen bg-gray-900 text-white p-5">
//       <ToastContainer />
//       <h1 className="text-2xl font-bold mb-4">Kubernetes Health Monitoring</h1>
      
//       {/* Controls */}
//       <div className="flex flex-wrap gap-4 mb-6 items-center">
//         <div>
//           <label className="text-sm block mb-1">Auto-refresh every</label>
//           <select 
//             className="p-2 bg-gray-800 border border-gray-700 rounded text-white"
//             value={refreshInterval}
//             onChange={(e) => setRefreshInterval(Number(e.target.value))}
//           >
//             <option value="2">2 seconds</option>
//             <option value="5">5 seconds</option>
//             <option value="10">10 seconds</option>
//             <option value="30">30 seconds</option>
//           </select>
//         </div>
        
//         <button 
//           className="bg-blue-600 p-2 rounded hover:bg-blue-700"
//           onClick={fetchSystemStatus}
//         >
//           Refresh Now
//         </button>

//         <button 
//   className="bg-green-600 p-2 rounded hover:bg-green-700"
//   onClick={handleRefreshAllNodes}
// >
//   Refresh All Nodes
// </button>
        
//         <div className="flex-grow"></div>
        
//         <div className="bg-gray-800 p-4 rounded border border-gray-700">
//           <h3 className="font-semibold mb-2">Simulate Heartbeat</h3>
//           <div className="flex gap-2 mb-2">
//             <select 
//               className="p-2 bg-gray-700 border border-gray-600 rounded text-white"
//               value={selectedNode || ""}
//               onChange={(e) => setSelectedNode(e.target.value)}
//             >
//               <option value="">Select Node</option>
//               {systemStatus?.nodes.map(node => (
//                 <option key={node.node_id} value={node.node_id}>
//                   {node.node_id} ({node.status})
//                 </option>
//               ))}
//             </select>
            
//             <button 
//               className="bg-green-600 px-4 rounded hover:bg-green-700"
//               onClick={handleTriggerHeartbeat}
//               disabled={!selectedNode}
//             >
//               Send Heartbeat
//             </button>
//           </div>
          
//           {selectedNode && systemStatus?.pods?.filter(pod => {
//             const node = systemStatus.nodes.find(n => n.node_id === selectedNode);
//             return pod.assigned_node === selectedNode && pod.status === "Running";
//           }).length > 0 && (
//             <div>
//               <p className="text-sm text-yellow-400 mb-1">Select pods to simulate failures:</p>
//               <div className="flex flex-wrap gap-2">
//                 {systemStatus?.pods
//                   ?.filter(pod => {
//                     const node = systemStatus.nodes.find(n => n.node_id === selectedNode);
//                     return pod.assigned_node === selectedNode && pod.status === "Running";
//                   })
//                   .map(pod => (
//                     <label key={pod.pod_id} className="flex items-center space-x-1 bg-gray-700 px-2 py-1 rounded">
//                       <input 
//                         type="checkbox" 
//                         checked={failingPods.includes(pod.pod_id)}
//                         onChange={() => togglePodFailure(pod.pod_id)}
//                         className="form-checkbox"
//                       />
//                       <span className="text-sm">{pod.pod_id}</span>
//                     </label>
//                   ))}
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
      
//       {loading && !systemStatus ? (
//         <div className="text-center py-10">
//           <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
//           <p>Loading system status...</p>
//         </div>
//       ) : systemStatus ? (
//         <>
//           {/* System Summary */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//             <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
//               <h2 className="text-xl font-semibold mb-4">Node Health</h2>
//               <div className="grid grid-cols-3 gap-3">
//                 <div className="bg-gray-700 p-3 rounded-lg text-center">
//                   <div className="text-2xl font-bold">{systemStatus.node_summary.total}</div>
//                   <div className="text-gray-400">Total Nodes</div>
//                 </div>
//                 <div className="bg-green-900 p-3 rounded-lg text-center">
//                   <div className="text-2xl font-bold">{systemStatus.node_summary.healthy}</div>
//                   <div className="text-green-300">Healthy</div>
//                 </div>
//                 <div className="bg-red-900 p-3 rounded-lg text-center">
//                   <div className="text-2xl font-bold">{systemStatus.node_summary.unhealthy}</div>
//                   <div className="text-red-300">Unhealthy</div>
//                 </div>
//               </div>
//             </div>
            
//             <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
//               <h2 className="text-xl font-semibold mb-4">Pod Health</h2>
//               <div className="grid grid-cols-4 gap-3">
//                 <div className="bg-gray-700 p-3 rounded-lg text-center">
//                   <div className="text-2xl font-bold">{systemStatus.pod_summary.total}</div>
//                   <div className="text-gray-400">Total Pods</div>
//                 </div>
//                 <div className="bg-green-900 p-3 rounded-lg text-center">
//                   <div className="text-2xl font-bold">{systemStatus.pod_summary.running}</div>
//                   <div className="text-green-300">Running</div>
//                 </div>
//                 <div className="bg-yellow-900 p-3 rounded-lg text-center">
//                   <div className="text-2xl font-bold">{systemStatus.pod_summary.pending}</div>
//                   <div className="text-yellow-300">Pending</div>
//                 </div>
//                 <div className="bg-red-900 p-3 rounded-lg text-center">
//                   <div className="text-2xl font-bold">{systemStatus.pod_summary.unhealthy}</div>
//                   <div className="text-red-300">Unhealthy</div>
//                 </div>
//               </div>
//             </div>
//           </div>
          
//           {/* Node Status */}
//           <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
//             <h2 className="text-xl font-semibold mb-4">Node Status</h2>
//             <div className="overflow-x-auto">
//               <table className="w-full border-collapse">
//                 <thead>
//                   <tr className="bg-gray-700">
//                     <th className="p-3 text-left border border-gray-600">Node ID</th>
//                     <th className="p-3 text-left border border-gray-600">Status</th>
//                     <th className="p-3 text-left border border-gray-600">CPU Usage</th>
//                     <th className="p-3 text-left border border-gray-600">Pods</th>
//                     <th className="p-3 text-left border border-gray-600">Last Heartbeat</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {systemStatus.nodes.map((node) => (
//                     <tr key={node.node_id} className="bg-gray-800 hover:bg-gray-700">
//                       <td className="p-3 border border-gray-600">{node.node_id}</td>
//                       <td className="p-3 border border-gray-600">
//                         <span className={`px-2 py-1 rounded-full text-xs ${
//                           node.status === "Healthy" 
//                             ? "bg-green-900 text-green-300" 
//                             : "bg-red-900 text-red-300"
//                         }`}>
//                           {node.status}
//                         </span>
//                       </td>
//                       <td className="p-3 border border-gray-600">
//                         <div className="flex items-center">
//                           <div className="w-full bg-gray-600 rounded-full h-2.5 mr-2">
//                             <div 
//                               className={`h-2.5 rounded-full ${
//                                 node.used_cores >= node.total_cores ? "bg-red-600" : "bg-blue-600"
//                               }`}
//                               style={{ width: `${Math.min((node.used_cores / node.total_cores) * 100, 100)}%` }}
//                             ></div>
//                           </div>
//                           <span className="whitespace-nowrap">
//                             {node.used_cores}/{node.total_cores} cores
//                           </span>
//                         </div>
//                       </td>
//                       <td className="p-3 border border-gray-600">{node.pod_count}</td>
//                       <td className="p-3 border border-gray-600">
//                         {node.last_heartbeat ? getTimeAgo(node.last_heartbeat) : "Never"}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
          
//           {/* Pod Status */}
//           <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
//             <h2 className="text-xl font-semibold mb-4">Pod Status</h2>
//             {systemStatus.pods.length > 0 ? (
//               <div className="overflow-x-auto">
//                 <table className="w-full border-collapse">
//                   <thead>
//                     <tr className="bg-gray-700">
//                       <th className="p-3 text-left border border-gray-600">Pod ID</th>
//                       <th className="p-3 text-left border border-gray-600">CPU</th>
//                       <th className="p-3 text-left border border-gray-600">Status</th>
//                       <th className="p-3 text-left border border-gray-600">Assigned Node</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {systemStatus.pods.map((pod) => (
//                       <tr key={pod.pod_id} className="bg-gray-800 hover:bg-gray-700">
//                         <td className="p-3 border border-gray-600">{pod.pod_id}</td>
//                         <td className="p-3 border border-gray-600">{pod.cpu_required}</td>
//                         <td className="p-3 border border-gray-600">
//                           <span className={`px-2 py-1 rounded-full text-xs ${
//                             pod.status === "Running" 
//                               ? "bg-green-900 text-green-300" 
//                               : pod.status === "Pending"
//                               ? "bg-yellow-900 text-yellow-300"
//                               : "bg-red-900 text-red-300"
//                           }`}>
//                             {pod.status}
//                           </span>
//                         </td>
//                         <td className="p-3 border border-gray-600">
//                           {pod.assigned_node || "None"}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             ) : (
//               <div className="text-gray-400">No pods deployed</div>
//             )}
//           </div>
//         </>
//       ) : (
//         <div className="bg-red-900 text-red-200 p-4 rounded">
//           Failed to load system status
//         </div>
//       )}
      
//       <div className="mt-4 text-gray-400 text-sm">
//         Last updated: {systemStatus ? new Date(systemStatus.timestamp).toLocaleTimeString() : "Never"}
//       </div>
//     </div>
//   );
// }

"use client";
import { useEffect, useState } from "react";
import { getSystemStatus, triggerHeartbeat, markNodeUnhealthy, refreshAllNodes } from "@/lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Monitoring() {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // in seconds
  const [selectedNode, setSelectedNode] = useState(null);
  const [failingPods, setFailingPods] = useState([]);

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      const data = await getSystemStatus();
      setSystemStatus(data);
    } catch (error) {
      console.error("Failed to fetch system status:", error);
      toast.error("Failed to fetch system status");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAllNodes = async () => {
    try {
      setLoading(true);
      await refreshAllNodes();
      toast.success("All nodes refreshed");
      await fetchSystemStatus();
    } catch (error) {
      console.error("Failed to refresh nodes:", error);
      toast.error("Failed to refresh nodes");
    } finally {
      setLoading(false);
    }
  };
  
  const handleTriggerHeartbeat = async () => {
    if (!selectedNode) {
      toast.warning("Please select a node");
      return;
    }

    try {
      await triggerHeartbeat(selectedNode, failingPods);
      toast.success(`Heartbeat sent for node ${selectedNode}`);
      
      // Clear selections
      setFailingPods([]);
      
      // Refresh status immediately
      fetchSystemStatus();
    } catch (error) {
      console.error("Failed to trigger heartbeat:", error);
      toast.error("Failed to trigger heartbeat");
    }
  };

  const togglePodFailure = (pod_id) => {
    if (failingPods.includes(pod_id)) {
      setFailingPods(failingPods.filter(id => id !== pod_id));
    } else {
      setFailingPods([...failingPods, pod_id]);
    }
  };

  const handleMarkNodeUnhealthy = async (node_id) => {
    if (!window.confirm(`Are you sure you want to mark node ${node_id} as unhealthy? This will reschedule all its pods to other healthy nodes.`)) {
      return;
    }
    
    try {
      setLoading(true);
      const result = await markNodeUnhealthy(node_id);
      toast.success(`Node ${node_id} marked as unhealthy. ${result.rescheduled_pods} pods rescheduled.`);
      await fetchSystemStatus();
    } catch (error) {
      console.error("Failed to mark node as unhealthy:", error);
      toast.error(error.response?.data?.error || "Failed to mark node as unhealthy");
    } finally {
      setLoading(false);
    }
  };
  
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Never";
    
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    return `${Math.floor(seconds / 3600)} hours ago`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-5">
      <ToastContainer />
      <h1 className="text-2xl font-bold mb-4">Kubernetes Health Monitoring</h1>
      
      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div>
          <label className="text-sm block mb-1">Auto-refresh every</label>
          <select 
            className="p-2 bg-gray-800 border border-gray-700 rounded text-white"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            <option value="2">2 seconds</option>
            <option value="5">5 seconds</option>
            <option value="10">10 seconds</option>
            <option value="30">30 seconds</option>
          </select>
        </div>
        
        <button 
          className="bg-blue-600 p-2 rounded hover:bg-blue-700"
          onClick={fetchSystemStatus}
        >
          Refresh Now
        </button>

        <button 
          className="bg-green-600 p-2 rounded hover:bg-green-700"
          onClick={handleRefreshAllNodes}
        >
          Refresh All Nodes
        </button>
        
        <div className="flex-grow"></div>
        
        <div className="bg-gray-800 p-4 rounded border border-gray-700">
          <h3 className="font-semibold mb-2">Simulate Heartbeat</h3>
          <div className="flex gap-2 mb-2">
            <select 
              className="p-2 bg-gray-700 border border-gray-600 rounded text-white"
              value={selectedNode || ""}
              onChange={(e) => setSelectedNode(e.target.value)}
            >
              <option value="">Select Node</option>
              {systemStatus?.nodes.map(node => (
                <option key={node.node_id} value={node.node_id}>
                  {node.node_id} ({node.status})
                </option>
              ))}
            </select>
            
            <button 
              className="bg-green-600 px-4 rounded hover:bg-green-700"
              onClick={handleTriggerHeartbeat}
              disabled={!selectedNode}
            >
              Send Heartbeat
            </button>
          </div>
          
          {selectedNode && systemStatus?.pods?.filter(pod => {
            const node = systemStatus.nodes.find(n => n.node_id === selectedNode);
            return pod.assigned_node === selectedNode && pod.status === "Running";
          }).length > 0 && (
            <div>
              <p className="text-sm text-yellow-400 mb-1">Select pods to simulate failures:</p>
              <div className="flex flex-wrap gap-2">
                {systemStatus?.pods
                  ?.filter(pod => {
                    const node = systemStatus.nodes.find(n => n.node_id === selectedNode);
                    return pod.assigned_node === selectedNode && pod.status === "Running";
                  })
                  .map(pod => (
                    <label key={pod.pod_id} className="flex items-center space-x-1 bg-gray-700 px-2 py-1 rounded">
                      <input 
                        type="checkbox" 
                        checked={failingPods.includes(pod.pod_id)}
                        onChange={() => togglePodFailure(pod.pod_id)}
                        className="form-checkbox"
                      />
                      <span className="text-sm">{pod.pod_id}</span>
                    </label>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {loading && !systemStatus ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p>Loading system status...</p>
        </div>
      ) : systemStatus ? (
        <>
          {/* System Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Node Health</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-700 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{systemStatus.node_summary.total}</div>
                  <div className="text-gray-400">Total Nodes</div>
                </div>
                <div className="bg-green-900 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{systemStatus.node_summary.healthy}</div>
                  <div className="text-green-300">Healthy</div>
                </div>
                <div className="bg-red-900 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{systemStatus.node_summary.unhealthy}</div>
                  <div className="text-red-300">Unhealthy</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Pod Health</h2>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-700 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{systemStatus.pod_summary.total}</div>
                  <div className="text-gray-400">Total Pods</div>
                </div>
                <div className="bg-green-900 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{systemStatus.pod_summary.running}</div>
                  <div className="text-green-300">Running</div>
                </div>
                <div className="bg-yellow-900 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{systemStatus.pod_summary.pending}</div>
                  <div className="text-yellow-300">Pending</div>
                </div>
                <div className="bg-red-900 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{systemStatus.pod_summary.unhealthy}</div>
                  <div className="text-red-300">Unhealthy</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Node Status */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-semibold mb-4">Node Status</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="p-3 text-left border border-gray-600">Node ID</th>
                    <th className="p-3 text-left border border-gray-600">Status</th>
                    <th className="p-3 text-left border border-gray-600">CPU Usage</th>
                    <th className="p-3 text-left border border-gray-600">Pods</th>
                    <th className="p-3 text-left border border-gray-600">Last Heartbeat</th>
                    <th className="p-3 text-left border border-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {systemStatus.nodes.map((node) => (
                    <tr key={node.node_id} className="bg-gray-800 hover:bg-gray-700">
                      <td className="p-3 border border-gray-600">{node.node_id}</td>
                      <td className="p-3 border border-gray-600">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          node.status === "Healthy" 
                            ? "bg-green-900 text-green-300" 
                            : "bg-red-900 text-red-300"
                        }`}>
                          {node.status}
                        </span>
                      </td>
                      <td className="p-3 border border-gray-600">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-600 rounded-full h-2.5 mr-2">
                            <div 
                              className={`h-2.5 rounded-full ${
                                node.used_cores >= node.total_cores ? "bg-red-600" : "bg-blue-600"
                              }`}
                              style={{ width: `${Math.min((node.used_cores / node.total_cores) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="whitespace-nowrap">
                            {node.used_cores}/{node.total_cores} cores
                          </span>
                        </div>
                      </td>
                      <td className="p-3 border border-gray-600">{node.pod_count}</td>
                      <td className="p-3 border border-gray-600">
                        {node.last_heartbeat ? getTimeAgo(node.last_heartbeat) : "Never"}
                      </td>
                      <td className="p-3 border border-gray-600">
                        {node.status === "Healthy" ? (
                          <button
                            className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 text-xs"
                            onClick={() => handleMarkNodeUnhealthy(node.node_id)}
                            disabled={loading}
                          >
                            Mark Unhealthy
                          </button>
                        ) : (
                          <button
                            className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 text-xs"
                            onClick={() => handleTriggerHeartbeat(node.node_id)}
                            disabled={loading}
                          >
                            Send Heartbeat
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pod Status */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Pod Status</h2>
            {systemStatus.pods.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-700">
                      <th className="p-3 text-left border border-gray-600">Pod ID</th>
                      <th className="p-3 text-left border border-gray-600">CPU</th>
                      <th className="p-3 text-left border border-gray-600">Status</th>
                      <th className="p-3 text-left border border-gray-600">Assigned Node</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemStatus.pods.map((pod) => (
                      <tr key={pod.pod_id} className="bg-gray-800 hover:bg-gray-700">
                        <td className="p-3 border border-gray-600">{pod.pod_id}</td>
                        <td className="p-3 border border-gray-600">{pod.cpu_required}</td>
                        <td className="p-3 border border-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            pod.status === "Running" 
                              ? "bg-green-900 text-green-300" 
                              : pod.status === "Pending"
                              ? "bg-yellow-900 text-yellow-300"
                              : "bg-red-900 text-red-300"
                          }`}>
                            {pod.status}
                          </span>
                        </td>
                        <td className="p-3 border border-gray-600">
                          {pod.assigned_node || "None"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-400">No pods deployed</div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-red-900 text-red-200 p-4 rounded">
          Failed to load system status
        </div>
      )}
      
      <div className="mt-4 text-gray-400 text-sm">
        Last updated: {systemStatus ? new Date(systemStatus.timestamp).toLocaleTimeString() : "Never"}
      </div>
    </div>
  );
}