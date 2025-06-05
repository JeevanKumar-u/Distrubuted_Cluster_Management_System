# Kubernetes Simulator Project

## Overview
This project implements a Kubernetes-like distributed system simulator that allows users to create virtual nodes, deploy pods, and observe how various scheduling algorithms affect pod placement and resource utilization. It also features an advanced health monitoring system that detects and responds to node failures by automatically rescheduling affected pods.

## Key Features
- **Node Management**: Create, monitor, and remove virtual nodes with specified CPU resources.
- **Pod Scheduling**: Deploy pods with CPU requirements using different scheduling algorithms.
- **Health Monitoring**: Track node health status via a heartbeat system.
- **Automatic Recovery**: Reschedule pods from unhealthy nodes to maintain service availability.
- **Resource Visualization**: Monitor CPU utilization and pod placement across the cluster.
- **Interactive Dashboard**: Web-based interface for managing the simulated cluster.

## Architecture
The project consists of two main components:

### Backend (Node.js/Express)
- RESTful API service managing the simulation logic.
- MongoDB database for persistent storage.
- Docker integration for simulating individual nodes.
- Health monitoring system with configurable heartbeat intervals.

### Frontend (Next.js)
- Dashboard for an overview of the cluster state.
- Pod scheduling interface with visualization of resource allocation.
- Health monitoring dashboard showing node and pod status.
- Interactive controls for testing failover scenarios.

## Scheduling Algorithms
The simulator implements three pod scheduling strategies:

1. **First-Fit**: Assigns pods to the first node with sufficient resources.
2. **Best-Fit**: Selects the node with the least remaining resources that can still fit the pod.
3. **Worst-Fit**: Chooses the node with the most available resources to allow for future larger pods.

## Health Monitoring System
The health monitoring system works through:

- **Periodic Heartbeats**: Nodes send heartbeat signals to the API server.
- **Failure Detection**: Nodes that fail to send heartbeats within a defined timeframe are marked as unhealthy.
- **Automatic Recovery**: Pods from failed nodes are automatically rescheduled to healthy nodes.
- **Status Updates**: Real-time monitoring of system health through the dashboard.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Docker
- npm or yarn

### Installation
Clone the repository:
```sh[
 git clone https://github.com/JeevanKumar-u/Distrubuted_Cluster_Management_System.git
 cd kubernetes-simulator
```

#### Backend Setup
Navigate to the backend directory and create a `.env` file with required configurations:
```sh
 cd backend
 touch .env
```
Install dependencies and start the backend server:
```sh
 npm install
 npm start
```

#### Frontend Setup
Navigate to the frontend directory:
```sh
 cd frontend
```
Install dependencies and start the frontend development server:
```sh
 npm install
 npm run dev
```



## Usage Guide

### Adding Nodes
1. Navigate to the Dashboard.
2. Enter a node ID and CPU cores.
3. Click "Add Node" to add the node to the cluster.

![Screenshot From 2025-06-05 14-30-50](https://github.com/user-attachments/assets/5773051c-ef7b-4b0d-b63b-fb883d2461d1)
![Screenshot From 2025-06-05 14-30-38](https://github.com/user-attachments/assets/3e07bdbc-6ac0-4968-9d3b-ba3f47d8f63f)

### Deploying Pods
1. Navigate to the Pod Scheduling interface.
2. Enter pod ID, CPU requirements, and select a scheduling strategy.
3. The scheduling preview will show where the pod will be placed.
4. Click "Deploy Pod" to schedule the pod.

![Screenshot From 2025-06-05 14-32-45](https://github.com/user-attachments/assets/a6ee7a68-3e78-4955-a991-6ebe0085db07)
![Screenshot From 2025-06-05 14-32-31](https://github.com/user-attachments/assets/31357541-0e98-4b7d-a468-1596ae66f1fd)



### Testing Health Monitoring
1. Navigate to the Health Monitoring dashboard.
2. Use the "Mark Unhealthy" button on a node to simulate node failure.
3. Observe how pods are automatically rescheduled to other healthy nodes.
4. Use "Restore All Nodes" to reset the system state.
![Screenshot From 2025-06-05 14-33-25](https://github.com/user-attachments/assets/f4c2737b-a28d-4da1-9631-42e734eec71f)


## API Endpoints

### Node Management
- `POST /add_node` - Create a new node
- `GET /list_nodes` - List all nodes
- `DELETE /remove_node/:node_id` - Remove a node
- `GET /health_check` - Check node health status

### Pod Management
- `POST /deploy_pod` - Deploy a pod using a scheduling algorithm
- `GET /list_pods` - List all pods
- `DELETE /delete_pod/:pod_id` - Delete a pod

### Health Monitoring
- `POST /heartbeat` - Receive node heartbeats
- `GET /system_status` - Get system health overview
- `POST /trigger_heartbeat/:node_id` - Manually trigger a heartbeat
- `POST /refresh_all_nodes` - Refresh all nodes
- `POST /mark_node_unhealthy/:node_id` - Mark a node as unhealthy

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.


## Acknowledgments
- **Kubernetes** - Inspiration for the project.
- **Docker** - Container virtualization.
- **Next.js & React** - Frontend framework.
- **MongoDB** - Database storage.




