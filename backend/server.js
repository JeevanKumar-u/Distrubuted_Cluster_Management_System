require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { exec } = require("child_process");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

//  Connect to MongoDB Atlas
   
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
    .then(async () => {
        console.log("Connected to MongoDB Atlas");
        
        // Initialize all nodes as healthy and set initial heartbeats
        try {
            const nodes = await Node.find({});
            nodes.forEach(node => {
                healthMonitor.lastHeartbeats[node.node_id] = Date.now();
                
                // Also update node status to healthy in database
                Node.updateOne(
                    { _id: node._id }, 
                    { status: "Healthy" }
                ).catch(err => console.error(`Failed to update node ${node.node_id} status:`, err));
            });
            console.log(`Initialized heartbeats for ${nodes.length} existing nodes`);
        } catch (err) {
            console.error("Failed to initialize node heartbeats:", err);
        }
    })
    .catch(err => console.error("MongoDB Connection Error:", err));



/*--------------------------------------------schema----------------------------------------------------*/
const nodeSchema = new mongoose.Schema({
    node_id: { type: String, required: true, unique: true },
    cpu_cores: { type: Number, required: true },
    status: { type: String, default: "Healthy" },
    container_id: String,
    created_at: { type: Date, default: Date.now },
    pods: [{
        pod_id: String,
        cpu_request: Number, 
        status: String,
        created_at: Date
    }]
});

const Node = mongoose.model("Node", nodeSchema);

// Define Mongoose Schema for Pods
const podSchema = new mongoose.Schema({
    pod_id: { type: String, required: true, unique: true },
    cpu_required: { type: Number, required: true },
    status: { type: String, default: "Pending" },
    assigned_node: { type: mongoose.Schema.Types.ObjectId, ref: "Node", default: null }
});
const Pod = mongoose.model("Pod", podSchema);


/*------------------------------------Node management--------------------------------------*/
//  Add a Node (Store in MongoDB + Create Docker Container)
app.post("/add_node", async (req, res) => {
    const { node_id, cpu_cores } = req.body;
    console.log(`Received request to add node: ${node_id} with ${cpu_cores} CPU cores`);
    
    if (!node_id || !cpu_cores) {
        return res.status(400).json({ error: "Node ID and CPU cores are required" });
    }

    try {
        // Check if node already exists in MongoDB
        let existingNode = await Node.findOne({ node_id });
        if (existingNode) {
            return res.status(400).json({ error: "Node already exists" });
        }

        // Launch a Docker container to simulate the node
        exec(`docker run -d --name ${node_id} alpine sleep 3600`, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Error creating Docker container: ${stderr}`);
                return res.status(500).json({ error: "Failed to create Docker container", details: stderr });
            }

            // Store Node Data in MongoDB
            const newNode = new Node({
                node_id,
                cpu_cores,
                container_id: stdout.trim(),
                status: "Healthy" 
            });

            await newNode.save();
            healthMonitor.lastHeartbeats[node_id] = Date.now();
            res.json({ message: `Node ${node_id} added successfully`, node: newNode });
        });

    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error });
    }
});

//  List All Nodes (Fetch from MongoDB)
// In your backend/server.js

// GET nodes endpoint
app.get("/list_nodes", async (req, res) => {
    try {
        const nodes = await Node.find();

        // Manually ensure all pod CPU data is properly converted to numbers
        nodes.forEach(node => {
            if (node.pods && Array.isArray(node.pods)) {
                node.pods.forEach(pod => {
                    // Ensure cpu_request is always set as a number
                    if (pod.cpu_request !== undefined) {
                        pod.cpu_request = Number(pod.cpu_request);
                    } else if (pod.cpu_required !== undefined) {
                        // If cpu_request is missing but cpu_required exists, use that value
                        pod.cpu_request = Number(pod.cpu_required);
                    }
                    
                    // Make sure we have at least one CPU field set
                    if (pod.cpu_request === undefined || isNaN(pod.cpu_request)) {
                        // Default to 1 core if no valid CPU data exists
                        pod.cpu_request = 1; 
                        console.log(`Warning: Pod ${pod.pod_id} had no valid CPU data, defaulting to 1 core`);
                    }
                });
            }
        });

        res.json(nodes);
    } catch (error) {
        console.error("Error fetching nodes:", error);
        res.status(500).json({ error: "Failed to fetch nodes" });
    }
});
// Remove a Node (Delete from MongoDB & Stop Docker Container)
app.delete("/remove_node/:node_id", async (req, res) => {
    const { node_id } = req.params;

    try {
        const node = await Node.findOne({ node_id });
        if (!node) {
            return res.status(404).json({ error: "Node not found" });
        }

        // Stop & Remove Docker Container
        exec(`docker stop ${node_id} && docker rm ${node_id}`, async (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: "Failed to remove Docker container", details: stderr });
            }

            // Remove from MongoDB
            await Node.deleteOne({ node_id });
            res.json({ message: `Node ${node_id} removed successfully` });
        });

    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Health Check (Check MongoDB + Docker Status)
app.get("/health_check", async (req, res) => {
    try {
        const nodes = await Node.find();
        let unhealthyNodes = [];

        const checkNodeHealth = (node, callback) => {
            exec(`docker inspect --format='{{.State.Running}}' ${node.node_id}`, async (error, stdout, stderr) => {
                if (error || stdout.trim() !== "true") {
                    node.status = "Unhealthy";
                    unhealthyNodes.push(node.node_id);
                } else {
                    node.status = "Healthy";
                }
                await node.save();
                callback();
            });
        };

        let completedChecks = 0;
        nodes.forEach(node => {
            checkNodeHealth(node, () => {
                completedChecks++;
                if (completedChecks === nodes.length) {
                    res.json({ nodes, unhealthyNodes });
                }
            });
        });

    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Restart an Unhealthy Node
app.post("/restart_node/:node_id", async (req, res) => {
    const { node_id } = req.params;

    if (!node_id) {
        return res.status(400).json({ error: "Node ID is required" });
    }

    try {
        const node = await Node.findOne({ node_id });
        if (!node) {
            return res.status(404).json({ error: "Node not found" });
        }

        exec(`docker restart ${node_id}`, async (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: "Failed to restart node", details: stderr });
            }

            node.status = "Healthy";
            await node.save();
            res.json({ message: `Node ${node_id} restarted successfully`, node });
        });

    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});



/*-------------------------------------podscheduling------------------------------------------------------------------------------------*/
// Schedule a Pod to a Node
app.post("/schedule_pod", async (req, res) => {
    const { pod_id, cpu_request, algorithm, node_id } = req.body;

    if (!pod_id || !cpu_request || !algorithm || !node_id) {
        return res.status(400).json({ error: "Pod ID, CPU request, algorithm, and node ID are required" });
    }

    try {
        // Find the target node
        const node = await Node.findOne({ node_id });
        if (!node) {
            return res.status(404).json({ error: "Target node not found" });
        }

        // Check if node has enough resources
        const usedCores = node.pods.reduce((sum, pod) => sum + pod.cpu_request, 0) || 0;
        const availableCores = node.cpu_cores - usedCores;

        if (availableCores < cpu_request) {
            return res.status(400).json({ error: "Node does not have enough CPU resources" });
        }

        // Add pod to the node
        const newPod = {
            pod_id,
            cpu_request,
            status: "Running",
            created_at: new Date()
        };

        node.pods.push(newPod);
        await node.save();

        res.json({ 
            message: `Pod ${pod_id} scheduled successfully on node ${node_id}`,
            pod: newPod,
            node
        });

    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error });
    }
});

// Add Pod API (Assign Pod to a Node Using Scheduling Algorithm)
// In backend/server.js
app.post("/deploy_pod", async (req, res) => {
    const { pod_id, cpu_required, strategy, node_id } = req.body;

    if (!pod_id || !cpu_required || !strategy) {
        return res.status(400).json({ error: "Pod ID, CPU required, and scheduling strategy are required" });
    }

    try {
        // Check if pod already exists
        const existingPod = await Pod.findOne({ pod_id });
        if (existingPod) {
            return res.status(400).json({ error: "Pod already exists" });
        }

        let selectedNode;

        // If node_id is provided, use that specific node
        if (node_id) {
            selectedNode = await Node.findOne({ node_id, status: "Healthy" });
            if (!selectedNode) {
                return res.status(404).json({ error: "Specified node not found or not healthy" });
            }
        } else {
            // Otherwise apply scheduling strategy
            const nodes = await Node.find({ status: "Healthy" });
            if (nodes.length === 0) {
                return res.status(400).json({ error: "No available nodes" });
            }

            // Check available resources on each node
            const eligibleNodes = nodes.filter(node => {
                const usedCores = node.pods?.reduce((sum, pod) => sum + (pod.cpu_request || 0), 0) || 0;
                return (node.cpu_cores - usedCores) >= cpu_required;
            });

            if (eligibleNodes.length === 0) {
                return res.status(400).json({ error: "No nodes with sufficient resources" });
            }

            // Apply scheduling strategy
            if (strategy === "first-fit") {
                selectedNode = eligibleNodes[0];
            } else if (strategy === "best-fit") {
                // Sort by available capacity (ascending)
                selectedNode = [...eligibleNodes].sort((a, b) => {
                    const aUsed = a.pods?.reduce((sum, pod) => sum + (pod.cpu_request || 0), 0) || 0;
                    const bUsed = b.pods?.reduce((sum, pod) => sum + (pod.cpu_request || 0), 0) || 0;
                    return (a.cpu_cores - aUsed) - (b.cpu_cores - bUsed);
                })[0];
            } else if (strategy === "worst-fit") {
                // Sort by available capacity (descending)
                selectedNode = [...eligibleNodes].sort((a, b) => {
                    const aUsed = a.pods?.reduce((sum, pod) => sum + (pod.cpu_request || 0), 0) || 0;
                    const bUsed = b.pods?.reduce((sum, pod) => sum + (pod.cpu_request || 0), 0) || 0;
                    return (b.cpu_cores - bUsed) - (a.cpu_cores - aUsed);
                })[0];
            }
        }

        if (!selectedNode) {
            return res.status(400).json({ error: "No suitable node found" });
        }

        // Double-check resource availability
        const usedCores = selectedNode.pods?.reduce((sum, pod) => sum + (pod.cpu_request || 0), 0) || 0;
        const availableCores = selectedNode.cpu_cores - usedCores;
        
        if (availableCores < cpu_required) {
            return res.status(400).json({ 
                error: `Node has insufficient resources. Available: ${availableCores}, Required: ${cpu_required}` 
            });
        }

        // Create the pod document
        const newPod = new Pod({
            pod_id,
            cpu_required,
            status: "Running",
            assigned_node: selectedNode._id
        });
        await newPod.save();

        // IMPORTANT: Add the pod to the node with the correct CPU data
        const podForNode = {
            pod_id,
            cpu_request: Number(cpu_required), // Make sure this is a number
            status: "Running",
            created_at: new Date()
        };

        // Add pod to node's pods array
        selectedNode.pods.push(podForNode);
        await selectedNode.save();

        // Return detailed response
        res.json({ 
            message: `Pod ${pod_id} deployed successfully on node ${selectedNode.node_id}`, 
            pod: newPod,
            node: selectedNode
        });
    } catch (error) {
        console.error("Pod deployment error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// List All Pods
app.get("/list_pods", async (req, res) => {
    try {
        const pods = await Pod.find().populate("assigned_node", "node_id");
        res.json(pods);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.delete("/delete_pod/:pod_id", async (req, res) => {
    const { pod_id } = req.params;
  
    try {
      // Find the pod to delete
      const pod = await Pod.findOne({ pod_id });
      if (!pod) {
        return res.status(404).json({ error: "Pod not found" });
      }
  
      // Remove the pod from the assigned node's pods array
      if (pod.assigned_node) {
        const node = await Node.findById(pod.assigned_node);
        if (node) {
          node.pods = node.pods.filter(p => p.pod_id !== pod_id);
          await node.save();
        }
      }
  
      // Delete the pod
      await Pod.deleteOne({ pod_id });
  
      res.json({ message: `Pod ${pod_id} deleted successfully` });
    } catch (error) {
      console.error("Error deleting pod:", error);
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  });

/*-------------------------------------health monitoring------------------------------------------------------------------------------------*/


// Add these endpoints to your existing server.js file

// Health Monitor Constants
const HEARTBEAT_TIMEOUT_MS = 600000; // 5 minutes
const healthMonitor = {
  lastHeartbeats: {}, // Store timestamps of last heartbeat for each node
  scheduledChecks: {}, // Store timeout IDs for scheduled health checks
};

// API endpoint for nodes to send heartbeats
app.post("/heartbeat", async (req, res) => {
  const { node_id, timestamp, pods_status } = req.body;

  if (!node_id) {
    return res.status(400).json({ error: "Node ID is required" });
  }

  try {
    // Find the node
    const node = await Node.findOne({ node_id });
    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    // Update last heartbeat time
    healthMonitor.lastHeartbeats[node_id] = Date.now();

    // Clear any scheduled health check for this node
    if (healthMonitor.scheduledChecks[node_id]) {
      clearTimeout(healthMonitor.scheduledChecks[node_id]);
    }

    // Schedule a new health check
    healthMonitor.scheduledChecks[node_id] = setTimeout(async () => {
      await checkNodeHealth(node_id);
    }, HEARTBEAT_TIMEOUT_MS);

    // Update pod status if provided
    if (pods_status && Array.isArray(pods_status)) {
      let unhealthyPods = [];
      
      // Update the status of each pod on this node
      for (const podStatus of pods_status) {
        if (podStatus.pod_id && podStatus.status) {
          // Find the pod in the node's pods array
          const podIndex = node.pods.findIndex(p => p.pod_id === podStatus.pod_id);
          
          if (podIndex !== -1) {
            // Update pod status
            const oldStatus = node.pods[podIndex].status;
            node.pods[podIndex].status = podStatus.status;
            
            // If pod is unhealthy, add to list
            if (podStatus.status === "Unhealthy" && oldStatus !== "Unhealthy") {
              unhealthyPods.push(podStatus.pod_id);
            }
          }
        }
      }
      
      // Take recovery actions for unhealthy pods
      if (unhealthyPods.length > 0) {
        await handleUnhealthyPods(node_id, unhealthyPods);
      }
    }

    // Update node status to Healthy
    if (node.status !== "Healthy") {
      node.status = "Healthy";
      await node.save();
    }

    res.json({ 
      message: "Heartbeat received", 
      next_heartbeat_due: Date.now() + HEARTBEAT_TIMEOUT_MS 
    });
  } catch (error) {
    console.error("Heartbeat error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Function to check node health and handle failures
async function checkNodeHealth(node_id) {
  try {
    const node = await Node.findOne({ node_id });
    if (!node) return;

    const lastHeartbeat = healthMonitor.lastHeartbeats[node_id] || 0;
    const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;

    if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
      console.log(`Node ${node_id} missed heartbeat. Marking as unhealthy.`);
      
      // Mark node as unhealthy
      node.status = "Unhealthy";
      await node.save();
      
      // Reschedule all pods from this node
      await reschedulePodsFromNode(node_id);
    }
  } catch (error) {
    console.error(`Error checking health for node ${node_id}:`, error);
  }
}

// Function to handle unhealthy pods
// Function to handle unhealthy pods
async function handleUnhealthyPods(node_id, podIds) {
  console.log(`Handling pods from unhealthy node ${node_id}:`, podIds);
  
  try {
    // Find the original node
    const sourceNode = await Node.findOne({ node_id });
    if (!sourceNode || !sourceNode.pods || sourceNode.pods.length === 0) {
      console.log(`No pods found on node ${node_id} to reschedule`);
      return;
    }
    
    // Get all healthy nodes
    const healthyNodes = await Node.find({ status: "Healthy", node_id: { $ne: node_id } });
    if (healthyNodes.length === 0) {
      console.log("No healthy nodes available for rescheduling");
      
      // Mark all pods as Pending since there are no healthy nodes
      for (const pod_id of podIds) {
        const pod = await Pod.findOne({ pod_id });
        if (pod) {
          pod.status = "Pending";
          pod.assigned_node = null;
          await pod.save();
          console.log(`No healthy nodes available. Pod ${pod_id} marked as Pending`);
        }
      }
      return;
    }

    // For each pod, find an appropriate node using best-fit algorithm
    for (const pod_id of podIds) {
      // Find the pod in the database
      const pod = await Pod.findOne({ pod_id });
      if (!pod) {
        console.log(`Pod ${pod_id} not found in database, skipping`);
        continue;
      }
      
      // Find the pod in the node's pods array to get accurate CPU request
      const nodePod = sourceNode.pods.find(p => p.pod_id === pod_id);
      if (!nodePod) {
        console.log(`Pod ${pod_id} not found in node.pods array, skipping`);
        continue;
      }
      
      const cpuRequired = nodePod.cpu_request || pod.cpu_required;
      
      // Find eligible nodes with sufficient resources
      const eligibleNodes = healthyNodes.filter(node => {
        const usedCores = node.pods?.reduce((sum, p) => sum + (p.cpu_request || 0), 0) || 0;
        return (node.cpu_cores - usedCores) >= cpuRequired;
      });
      
      if (eligibleNodes.length === 0) {
        // No eligible nodes found, mark pod as Pending
        pod.status = "Pending";
        pod.assigned_node = null;
        await pod.save();
        console.log(`No eligible nodes found for pod ${pod_id}, marked as Pending`);
        continue;
      }
      
      // Apply best-fit algorithm: select the node with the least remaining resources
      // that can still fit the pod (to minimize fragmentation)
      const targetNode = [...eligibleNodes].sort((a, b) => {
        const aUsed = a.pods?.reduce((sum, p) => sum + (p.cpu_request || 0), 0) || 0;
        const bUsed = b.pods?.reduce((sum, p) => sum + (p.cpu_request || 0), 0) || 0;
        
        const aAvailable = a.cpu_cores - aUsed;
        const bAvailable = b.cpu_cores - bUsed;
        
        // Sort by available capacity (ascending) - best fit means smallest node that fits
        return aAvailable - bAvailable;
      })[0];
      
      console.log(`Selected node ${targetNode.node_id} for pod ${pod_id} using best-fit algorithm`);
      
      // Add pod to target node
      targetNode.pods.push({
        pod_id: pod_id,
        cpu_request: cpuRequired,
        status: "Running",
        created_at: new Date()
      });
      
      await targetNode.save();
      
      // Update pod's assigned node
      pod.assigned_node = targetNode._id;
      pod.status = "Running";
      await pod.save();
      
      console.log(`Rescheduled pod ${pod_id} from node ${node_id} to node ${targetNode.node_id}`);
    }
    
    // Remove all rescheduled pods from the source node
    sourceNode.pods = sourceNode.pods.filter(p => !podIds.includes(p.pod_id));
    await sourceNode.save();
    
  } catch (error) {
    console.error("Error handling pod rescheduling:", error);
  }
}

// Function to reschedule all pods from an unhealthy node
async function reschedulePodsFromNode(node_id) {
  try {
    // Find all pods on this node
    const node = await Node.findOne({ node_id });
    if (!node || !node.pods || node.pods.length === 0) {
      console.log(`No pods to reschedule from node ${node_id}`);
      return;
    }
    
    const podIds = node.pods.map(pod => pod.pod_id);
    console.log(`Rescheduling ${podIds.length} pods from unhealthy node ${node_id}:`, podIds);
    
    // Use handleUnhealthyPods to reschedule them
    await handleUnhealthyPods(node_id, podIds);
    
  } catch (error) {
    console.error(`Error rescheduling pods from node ${node_id}:`, error);
  }
}

// Endpoint to get system health status
app.get("/system_status", async (req, res) => {
  try {
    const nodes = await Node.find();
    const pods = await Pod.find().populate("assigned_node", "node_id");
    
    // Calculate counts
    const healthyNodeCount = nodes.filter(node => node.status === "Healthy").length;
    const unhealthyNodeCount = nodes.length - healthyNodeCount;
    
    const runningPodCount = pods.filter(pod => pod.status === "Running").length;
    const pendingPodCount = pods.filter(pod => pod.status === "Pending").length;
    const unhealthyPodCount = pods.filter(pod => pod.status === "Unhealthy").length;
    
    // Calculate node resource usage
    const nodeUsage = nodes.map(node => {
      const usedCores = node.pods?.reduce((sum, pod) => sum + (pod.cpu_request || 0), 0) || 0;
      return {
        node_id: node.node_id,
        total_cores: node.cpu_cores,
        used_cores: usedCores,
        available_cores: node.cpu_cores - usedCores,
        pod_count: node.pods?.length || 0,
        status: node.status,
        last_heartbeat: healthMonitor.lastHeartbeats[node.node_id] || null
      };
    });
    
    res.json({
      timestamp: Date.now(),
      node_summary: {
        total: nodes.length,
        healthy: healthyNodeCount,
        unhealthy: unhealthyNodeCount
      },
      pod_summary: {
        total: pods.length,
        running: runningPodCount,
        pending: pendingPodCount,
        unhealthy: unhealthyPodCount
      },
      nodes: nodeUsage,
      pods: pods.map(pod => ({
        pod_id: pod.pod_id,
        cpu_required: pod.cpu_required,
        status: pod.status,
        assigned_node: pod.assigned_node?.node_id || null
      }))
    });
  } catch (error) {
    console.error("Error fetching system status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint to manually trigger a node heartbeat (for testing)
app.post("/trigger_heartbeat/:node_id", async (req, res) => {
  const { node_id } = req.params;
  const { fail_pods = [] } = req.body; // Optional array of pod_ids to mark as unhealthy
  
  try {
    const node = await Node.findOne({ node_id });
    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }
    
    // Create pod status array
    const pods_status = node.pods.map(pod => ({
      pod_id: pod.pod_id,
      status: fail_pods.includes(pod.pod_id) ? "Unhealthy" : "Running"
    }));
    
    healthMonitor.lastHeartbeats[node_id] = Date.now();
    // Call the heartbeat endpoint internally
    if (healthMonitor.scheduledChecks[node_id]) {
        clearTimeout(healthMonitor.scheduledChecks[node_id]);
      }
      
      // Schedule a new health check
      healthMonitor.scheduledChecks[node_id] = setTimeout(async () => {
        await checkNodeHealth(node_id);
      }, HEARTBEAT_TIMEOUT_MS);
      
      // Update pod status if provided
      let unhealthyPods = [];
      for (const podStatus of pods_status) {
        if (podStatus.pod_id && podStatus.status) {
          // Find the pod in the node's pods array
          const podIndex = node.pods.findIndex(p => p.pod_id === podStatus.pod_id);
          
          if (podIndex !== -1) {
            // Update pod status
            const oldStatus = node.pods[podIndex].status;
            node.pods[podIndex].status = podStatus.status;
            
            // If pod is unhealthy, add to list
            if (podStatus.status === "Unhealthy" && oldStatus !== "Unhealthy") {
              unhealthyPods.push(podStatus.pod_id);
            }
          }
        }
    }
    // Take recovery actions for unhealthy pods
    if (unhealthyPods.length > 0) {
        await handleUnhealthyPods(node_id, unhealthyPods);
      }
      
      // Update node status to Healthy
      if (node.status !== "Healthy") {
        node.status = "Healthy";
      }
      
      await node.save();
      
      res.json({ 
        message: "Heartbeat received", 
        next_heartbeat_due: Date.now() + HEARTBEAT_TIMEOUT_MS 
      });
    } catch (error) {
      console.error("Error triggering heartbeat:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  app.post("/refresh_all_nodes", async (req, res) => {
    try {
      const nodes = await Node.find();
      let results = [];
      
      for (const node of nodes) {
        // Update heartbeat timestamp
        healthMonitor.lastHeartbeats[node.node_id] = Date.now();
        
        // Clear existing scheduled check
        if (healthMonitor.scheduledChecks[node.node_id]) {
          clearTimeout(healthMonitor.scheduledChecks[node.node_id]);
        }
        
        // Schedule new health check
        healthMonitor.scheduledChecks[node.node_id] = setTimeout(async () => {
          await checkNodeHealth(node.node_id);
        }, HEARTBEAT_TIMEOUT_MS);
        
        // Mark node as healthy
        node.status = "Healthy";
        await node.save();
        
        results.push({
          node_id: node.node_id,
          status: "Heartbeat updated"
        });
    }
    
    res.json({
      message: `Updated heartbeats for ${results.length} nodes`,
      results
    });
  } catch (error) {
    console.error("Error refreshing nodes:", error);
    res.status(500).json({ error: "Failed to refresh nodes" });
  }
});

// Endpoint to manually mark a node as unhealthy
app.post("/mark_node_unhealthy/:node_id", async (req, res) => {
  const { node_id } = req.params;
  
  try {
    const node = await Node.findOne({ node_id });
    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }
    
    console.log(`Manually marking node ${node_id} as unhealthy and triggering pod rescheduling`);
    
    // Mark node as unhealthy
    node.status = "Unhealthy";
    await node.save();
    
    // Reschedule all pods from this node
    await reschedulePodsFromNode(node_id);
    
    res.json({
      message: `Node ${node_id} marked as unhealthy`,
      rescheduled_pods: node.pods.length
    });
  } catch (error) {
    console.error("Error marking node as unhealthy:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
    
  



//  Start the API server
app.listen(PORT, () => {
    console.log(`API Server running at http://localhost:${PORT}`);
});
