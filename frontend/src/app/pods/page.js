
"use client";
import { useEffect, useState } from "react";
import { deployPod, getPods, getNodes } from "@/lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Pods() {
    const [pods, setPods] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [podId, setPodId] = useState("");
    const [cpuRequired, setCpuRequired] = useState(1);
    const [strategy, setStrategy] = useState("first-fit");
    const [loading, setLoading] = useState(false);
    const [previewNode, setPreviewNode] = useState(null);

    useEffect(() => {
        fetchData();
        const refreshInterval = setInterval(fetchData, 5000);
        return () => clearInterval(refreshInterval);
    }, []);

    const fetchData = async () => {
        try {
            const [podsData, nodesData] = await Promise.all([getPods(), getNodes()]);
            setPods(podsData);
            setNodes(nodesData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("Failed to fetch data");
        }
    };

    // Calculate used CPU cores by aggregating all pods assigned to this node
    const calculateUsedCores = (nodeId) => {
        return pods
            .filter(pod => pod.assigned_node?.node_id === nodeId)
            .reduce((sum, pod) => sum + (pod.cpu_required || pod.cpu_request || 0), 0);
    };

    // Preview node selection based on strategy
    useEffect(() => {
        if (nodes.length === 0 || cpuRequired <= 0) {
            setPreviewNode(null);
            return;
        }

        const eligibleNodes = nodes
            .map(node => {
                const usedCores = calculateUsedCores(node.node_id);
                const availableCores = node.cpu_cores - usedCores;
                return {
                    ...node,
                    usedCores,
                    availableCores
                };
            })
            .filter(node => 
                node.status === "Healthy" && 
                node.availableCores >= cpuRequired
            );

        if (eligibleNodes.length === 0) {
            setPreviewNode(null);
            return;
        }

        let selectedNode = null;
        switch (strategy) {
            case "best-fit":
                selectedNode = [...eligibleNodes].sort((a, b) => 
                    a.availableCores - b.availableCores
                )[0];
                break;
            case "worst-fit":
                selectedNode = [...eligibleNodes].sort((a, b) => 
                    b.availableCores - a.availableCores
                )[0];
                break;
            default: // first-fit
                selectedNode = eligibleNodes[0];
        }

        setPreviewNode(selectedNode);
    }, [nodes, pods, cpuRequired, strategy]);

    const handleDeployPod = async (e) => {
        e.preventDefault();
        
        if (!podId) {
            toast.warning("Please enter a Pod ID");
            return;
        }

        if (!cpuRequired || cpuRequired <= 0) {
            toast.warning("Please enter valid CPU requirement");
            return;
        }

        if (!previewNode) {
            toast.error("No suitable node available for this pod");
            return;
        }

        // Final verification of node capacity
        const usedCores = calculateUsedCores(previewNode.node_id);
        const availableCores = previewNode.cpu_cores - usedCores;
        
        if (availableCores < cpuRequired) {
            toast.error(`Selected node no longer has enough capacity. Available: ${availableCores}, Required: ${cpuRequired}`);
            await fetchData();
            return;
        }

        try {
            setLoading(true);
            await deployPod(podId, Number(cpuRequired), strategy, previewNode.node_id);
            toast.success("Pod deployed successfully!");
            setPodId("");
            setCpuRequired(1);
            await fetchData();
        } catch (error) {
            console.error("Error deploying pod:", error);
            toast.error(error.response?.data?.error || "Failed to deploy pod");
        } finally {
            setLoading(false);
        }
    };

    // Render functions remain the same as your original code
    return (
        <div className="min-h-screen bg-gray-900 text-white p-5">
            <ToastContainer />
            <h1 className="text-2xl font-bold mb-6">Pod Scheduling</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pod Deployment Form */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4">Deploy New Pod</h2>
                    <form onSubmit={handleDeployPod} className="space-y-4">
                        <div>
                            <label className="block mb-1">Pod ID</label>
                            <input 
                                type="text" 
                                placeholder="Enter unique pod identifier" 
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                                value={podId} 
                                onChange={(e) => setPodId(e.target.value)} 
                            />
                        </div>
                        
                        <div>
                            <label className="block mb-1">CPU Required</label>
                            <input 
                                type="number" 
                                placeholder="CPU cores needed" 
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                                value={cpuRequired} 
                                onChange={(e) => setCpuRequired(Number(e.target.value))}
                                min="1" 
                            />
                        </div>
                        
                        <div>
                            <label className="block mb-1">Scheduling Strategy</label>
                            <select 
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                                value={strategy} 
                                onChange={(e) => setStrategy(e.target.value)}
                            >
                                <option value="first-fit">First Fit</option>
                                <option value="best-fit">Best Fit (Smallest suitable node)</option>
                                <option value="worst-fit">Worst Fit (Largest available node)</option>
                            </select>
                        </div>
                        
                        <button 
                            type="submit" 
                            className={`w-full p-2 rounded font-semibold ${
                                loading || !previewNode 
                                    ? "bg-gray-600 cursor-not-allowed" 
                                    : "bg-blue-600 hover:bg-blue-700"
                            }`}
                            disabled={loading || !previewNode}
                        >
                            {loading ? "Deploying..." : "Deploy Pod"}
                        </button>
                    </form>
                </div>
                
                {/* Scheduling Preview */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4">Scheduling Preview</h2>
                    
                    {nodes.length === 0 ? (
                        <div className="text-yellow-400">No nodes available. Add nodes first.</div>
                    ) : !cpuRequired ? (
                        <div className="text-gray-400">Enter CPU requirements to see scheduling preview</div>
                    ) : !previewNode ? (
                        <div className="text-red-400">No suitable node found for this pod configuration</div>
                    ) : (
                        <div>
                            <div className="p-4 mb-4 bg-gray-700 rounded-lg border border-green-800">
                                <h3 className="font-semibold text-green-400 mb-2">Pod will be scheduled on:</h3>
                                <p><span className="text-gray-400">Node ID:</span> {previewNode.node_id}</p>
                                <p><span className="text-gray-400">Total CPU:</span> {previewNode.cpu_cores} cores</p>
                                <p><span className="text-gray-400">Currently Used:</span> {previewNode.usedCores} cores</p>
                                <p><span className="text-gray-400">Available:</span> {previewNode.availableCores} cores</p>
                                <p className={`${previewNode.availableCores < cpuRequired ? 'text-red-500 font-bold' : 'text-green-400'}`}>
                                    <span className="text-gray-400">After Scheduling:</span> {previewNode.availableCores - cpuRequired} cores will remain
                                </p>
                                <p><span className="text-gray-400">Pods running:</span> {pods.filter(p => p.assigned_node?.node_id === previewNode.node_id).length}</p>
                            </div>
                            
                            <div>
                                <h3 className="font-semibold mb-2">Strategy Explanation</h3>
                                {strategy === "first-fit" && (
                                    <p className="text-sm text-gray-300">First Fit selects the first node with enough available resources to host the pod.</p>
                                )}
                                {strategy === "best-fit" && (
                                    <p className="text-sm text-gray-300">Best Fit selects the node with the least remaining resources that can still fit the pod.</p>
                                )}
                                {strategy === "worst-fit" && (
                                    <p className="text-sm text-gray-300">Worst Fit selects the node with the most remaining resources to allow for future larger pods.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Pods List */}
            <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-semibold mb-4">Deployed Pods</h2>
                
                {pods.length > 0 ? (
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
                                {pods.map((pod) => (
                                    <tr key={pod.pod_id} className="bg-gray-800 hover:bg-gray-700">
                                        <td className="p-3 border border-gray-600">{pod.pod_id}</td>
                                        <td className="p-3 border border-gray-600">{pod.cpu_required || pod.cpu_request}</td>
                                        <td className="p-3 border border-gray-600">
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                pod.status === "Running" 
                                                    ? "bg-green-900 text-green-300" 
                                                    : "bg-yellow-900 text-yellow-300"
                                            }`}>
                                                {pod.status}
                                            </span>
                                        </td>
                                        <td className="p-3 border border-gray-600">
                                            {pod.assigned_node?.node_id || "None"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-gray-400">No pods have been deployed yet</div>
                )}
            </div>
            
            {/* Nodes Overview */}
            <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-semibold mb-4">Available Nodes</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nodes.map((node) => {
                        const usedCpuCores = calculateUsedCores(node.node_id);
                        const availableCpuCores = node.cpu_cores - usedCpuCores;
                        const nodePods = pods.filter(p => p.assigned_node?.node_id === node.node_id);

                        return (
                            <div key={node.node_id} className={`p-4 rounded-lg border ${
                                node.status === "Healthy" ? "border-green-800 bg-gray-700" : "border-red-800 bg-gray-700"
                            }`}>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold">{node.node_id}</h3>
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                        node.status === "Healthy" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                                    }`}>
                                        {node.status}
                                    </span>
                                </div>
                                <p><span className="text-gray-400">Total CPU:</span> {node.cpu_cores} cores</p>
                                <p><span className="text-gray-400">Available CPU:</span> {availableCpuCores} cores</p>
                                <p><span className="text-gray-400">Pods:</span> {nodePods.length}</p>
                                
                                {/* CPU Usage Bar */}
                                <div className="mt-2">
                                    <div className="w-full bg-gray-600 rounded-full h-2.5">
                                        <div 
                                            className={`h-2.5 rounded-full ${
                                                usedCpuCores >= node.cpu_cores ? "bg-red-600" : "bg-blue-600"
                                            }`}
                                            style={{ width: `${Math.min((usedCpuCores / node.cpu_cores) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {usedCpuCores} / {node.cpu_cores} cores used
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {nodes.length === 0 && (
                    <div className="text-gray-400">No nodes available</div>
                )}
            </div>
        </div>
    );
}