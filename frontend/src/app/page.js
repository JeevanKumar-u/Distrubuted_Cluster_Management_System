"use client";
import { useEffect, useState } from "react";
import { getNodes, addNode, removeNode, healthCheck, restartNode } from "@/lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Link from "next/link";
export default function Dashboard() {
    const [nodes, setNodes] = useState([]);
    const [nodeId, setNodeId] = useState("");
    const [cpuCores, setCpuCores] = useState("");

    useEffect(() => {
        fetchNodes();
    }, []);

    const fetchNodes = async () => {
        try {
            const data = await getNodes();
            setNodes(data);
        } catch (error) {
            toast.error("Failed to fetch nodes");
        }
    };

    const handleAddNode = async () => {
        if (!nodeId || !cpuCores) {
            toast.warning("Please enter Node ID and CPU Cores");
            return;
        }
        try {
            await addNode(nodeId, Number(cpuCores));
            toast.success("Node added successfully!");
            fetchNodes();
        } catch (error) {
            toast.error("Failed to add node");
        }
    };

    const handleRemoveNode = async (node_id) => {
        try {
            await removeNode(node_id);
            toast.success("Node removed successfully!");
            fetchNodes();
        } catch (error) {
            toast.error("Failed to remove node");
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-5">
            <ToastContainer />
            <h1 className="text-2xl font-bold mb-4">Kubernetes Cluster Simulation</h1>

            {/* Add Node */}
            <div className="flex gap-3 mb-5">
                <input type="text" placeholder="Node ID" className="p-2 bg-gray-800 border rounded" value={nodeId} onChange={(e) => setNodeId(e.target.value)} />
                <input type="number" placeholder="CPU Cores" className="p-2 bg-gray-800 border rounded" value={cpuCores} onChange={(e) => setCpuCores(e.target.value)} />
                <button className="bg-blue-600 p-2 rounded" onClick={handleAddNode}>Add Node</button>
            </div>

            {/* Nodes Table */}
            <table className="w-full border-collapse border border-gray-700">
                <thead>
                    <tr className="bg-gray-800">
                        <th className="p-3 border">Node ID</th>
                        <th className="p-3 border">CPU Cores</th>
                        <th className="p-3 border">Status</th>
                        <th className="p-3 border">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {nodes.length > 0 ? (
                        nodes.map((node) => (
                            <tr key={node.node_id} className="bg-gray-700">
                                <td className="p-3 border">{node.node_id}</td>
                                <td className="p-3 border">{node.cpu_cores}</td>
                                <td className="p-3 border">{node.status}</td>
                                <td className="p-3 border">
                                    <button className="bg-red-600 p-1 rounded mr-2" onClick={() => handleRemoveNode(node.node_id)}>Remove</button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4" className="text-center p-3">No nodes found</td>
                        </tr>
                    )}
                </tbody>
            </table>
            <div className="mb-5 space-x-4">
    <Link href="/pods" className="bg-blue-600 p-2 rounded inline-block">
        Go to Pod Scheduling
    </Link>

    <Link href="/monitoring" className="bg-blue-600 p-2 rounded inline-block">
        Go to Health Monitoring
    </Link>
</div>
        </div>
        
    );
}
