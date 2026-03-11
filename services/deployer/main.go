package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

type DeploymentTask struct {
	ID           string            `json:"id"`
	RepoName     string            `json:"repo_name"`
	RepoFullName string            `json:"repo_full_name"`
	RepoID       string            `json:"repo_id"`
	GithubToken  string            `json:"github_token"`
	Branch             string            `json:"branch"`
	Language           string            `json:"language"`
	DockerfileTemplate string            `json:"dockerfile_template"`
	DeployType         string            `json:"deploy_type"`
	BuildCommand string            `json:"build_command"`
	StartCommand string            `json:"start_command"`
	DockerConfig DockerConfig      `json:"docker_config"`
	EnvVars      map[string]string `json:"env_vars"`
}

type DockerConfig struct {
	Source         string `json:"source"`
	DockerfilePath string `json:"dockerfile_path"`
	BuildContext   string `json:"build_context"`
	ContainerPort  string `json:"container_port"`
	RegistryImage  string `json:"registry_image"`
}

var globalRDB *redis.Client

func main() {
	// Load .env file
	godotenv.Load()

	log.Println("DevOps Deployer Service Starting...")

	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "localhost"
	}
	redisPort := os.Getenv("REDIS_PORT")
	if redisPort == "" {
		redisPort = "6379"
	}
	redisUser := os.Getenv("REDIS_USERNAME")
	redisPass := os.Getenv("REDIS_PASSWORD")

	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", redisHost, redisPort),
		Username: redisUser,
		Password: redisPass,
		DB:       0,
	})
	globalRDB = rdb

	ctx := context.Background()

	// Wait for Redis to be ready
	for {
		err := rdb.Ping(ctx).Err()
		if err == nil {
			break
		}
		log.Printf("Waiting for Redis... %v", err)
		time.Sleep(2 * time.Second)
	}

	log.Println("Connected to Redis. Listening for deployments...")

	for {
		// BLPOP blocks until a message is available in the 'deployments' list
		result, err := rdb.BLPop(ctx, 0, "deployments").Result()
		if err != nil {
			log.Printf("Error pulling from queue: %v", err)
			continue
		}

		message := result[1]
		var task DeploymentTask
		if err := json.Unmarshal([]byte(message), &task); err != nil {
			log.Printf("Error decoding task: %v", err)
			continue
		}

		log.Printf("Received Deployment Task: %s\n", task.RepoName)
		processDeployment(task)
	}
}

func reportStatus(projectID string, status string, containerID string) {
	backendURL := os.Getenv("BACKEND_API_URL")
	if backendURL == "" {
		backendURL = "http://localhost:8000/api/v1"
	}

	updateURL := fmt.Sprintf("%s/projects/internal/%s/status", backendURL, projectID)
	
	payload := map[string]string{
		"status": status,
	}
	if containerID != "" {
		payload["container_id"] = containerID
	}

	jsonPayload, _ := json.Marshal(payload)
	
	req, _ := http.NewRequest("PATCH", updateURL, bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Failed to report status to backend: %v\n", err)
		return
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		log.Printf("Backend returned error on status update: %d\n", resp.StatusCode)
	}
}

func reportLog(projectID string, logType string, text string) {
	if globalRDB == nil {
		return
	}
	
	logEntry := map[string]string{
		"time": time.Now().Format("15:04:05"),
		"type": logType,
		"text": text,
	}
	
	jsonLog, _ := json.Marshal(logEntry)
	key := fmt.Sprintf("logs:%s", projectID)
	
	ctx := context.Background()
	globalRDB.RPush(ctx, key, string(jsonLog))
	globalRDB.LTrim(ctx, key, -100, -1) // Keep last 100 logs
	globalRDB.Expire(ctx, key, 1*time.Hour)
}

func processDeployment(task DeploymentTask) {
	log.Printf(">>> Initiating Deployment Sequence: %s (ID: %s)\n", task.RepoName, task.ID)
	reportStatus(task.ID, "deploying", "")

	// Create work directory
	workDir := filepath.Join("projects", task.ID)
	err := os.MkdirAll(workDir, 0755)
	if err != nil {
		log.Printf("Failed to create work directory: %v\n", err)
		reportStatus(task.ID, "failed", "")
		return
	}

	// 1. Clone/Sync Repository
	repoPath := filepath.Join(workDir, "source")
	repoURL := fmt.Sprintf("https://%s@github.com/%s.git", task.GithubToken, task.RepoFullName)

	if _, err := os.Stat(repoPath); os.IsNotExist(err) {
		msg := fmt.Sprintf("Cloning repository %s (branch: %s)...", task.RepoFullName, task.Branch)
		log.Println(msg)
		reportLog(task.ID, "info", msg)
		
		cmd := exec.Command("git", "clone", "-b", task.Branch, repoURL, repoPath)
		if _, err := cmd.CombinedOutput(); err != nil {
			errStr := fmt.Sprintf("Clone failed: %v", err)
			log.Println(errStr)
			reportLog(task.ID, "error", errStr)
			reportStatus(task.ID, "failed", "")
			return
		}
		reportLog(task.ID, "success", "Repository cloned successfully.")
	} else {
		msg := fmt.Sprintf("Pulling latest changes for %s...", task.RepoFullName)
		log.Println(msg)
		reportLog(task.ID, "info", msg)
		cmd := exec.Command("git", "-C", repoPath, "pull")
		cmd.CombinedOutput()
	}

	// 2. Prepare Docker Environment
	imageName := strings.ToLower(fmt.Sprintf("devops-%s", task.RepoName))
	containerName := strings.ToLower(fmt.Sprintf("devops-svc-%s", task.RepoName))
	
	var deploymentFailed bool
	defer func() {
		if deploymentFailed {
			log.Printf("Executing automatic cleanup for failed deployment: %s\n", task.ID)
			reportLog(task.ID, "warn", "System Failure Detected: Initiating automatic cleanup sequence...")
			exec.Command("docker", "stop", containerName).Run()
			exec.Command("docker", "rm", containerName).Run()
			reportStatus(task.ID, "failed", "")
		}
	}()

	// Cleanup existing container
	msg := fmt.Sprintf("Cleaning up existing container if present: %s", containerName)
	log.Println(msg)
	reportLog(task.ID, "info", msg)
	exec.Command("docker", "stop", containerName).Run()
	exec.Command("docker", "rm", containerName).Run()

	dfPath := task.DockerConfig.DockerfilePath
	if dfPath == "" { dfPath = "Dockerfile" }
	
	buildCtx := task.DockerConfig.BuildContext
	if buildCtx == "" { buildCtx = "." }

	absDFPath := filepath.Join(repoPath, dfPath)
	absCtxPath := filepath.Join(repoPath, buildCtx)

	// If Pipeline deployment, and we have a template, generate the Dockerfile
	if task.DeployType == "pipeline" && task.DockerfileTemplate != "" {
		reportLog(task.ID, "info", fmt.Sprintf("Generating Dockerfile from stack template: %s", task.Language))
		template := task.DockerfileTemplate
		template = strings.ReplaceAll(template, "${BUILD_COMMAND}", task.BuildCommand)
		template = strings.ReplaceAll(template, "${START_COMMAND}", task.StartCommand)

		err := os.WriteFile(absDFPath, []byte(template), 0644)
		if err != nil {
			errStr := fmt.Sprintf("Failed to write generated Dockerfile: %v", err)
			log.Println(errStr)
			reportLog(task.ID, "error", errStr)
			deploymentFailed = true
			return
		}
		reportLog(task.ID, "success", "Dockerfile generated successfully.")
	}

	// If Pipeline deployment, and NO Dockerfile, report error
	if task.DeployType == "pipeline" {
		if _, err := os.Stat(absDFPath); os.IsNotExist(err) {
			log.Printf("Pipeline deployment: No Dockerfile found at %s. Please provide a Dockerfile in your repository or select a Stack.\n", dfPath)
			reportLog(task.ID, "error", "Critical: No Dockerfile found and no stack template provided. Deployment aborted.")
			deploymentFailed = true
			return
		}
	}

	// Double check Dockerfile exists now
	if _, err := os.Stat(absDFPath); os.IsNotExist(err) {
		log.Printf("CRITICAL: Dockerfile missing at %s. Aborting.\n", absDFPath)
		deploymentFailed = true
		return
	}

	log.Println("Building Docker image...")
	reportLog(task.ID, "info", "Starting Docker build process...")
	
	// Use --platform linux/amd64 for better compatibility and --no-cache to see full progress
	buildCmd := exec.Command("docker", "build", "--platform", "linux/amd64", "-t", imageName, "-f", absDFPath, absCtxPath)
	
	// Stream output to logs concurrently
	stdout, _ := buildCmd.StdoutPipe()
	stderr, _ := buildCmd.StderrPipe()
	
	if err := buildCmd.Start(); err != nil {
		errStr := fmt.Sprintf("Failed to start Docker build: %v", err)
		log.Println(errStr)
		reportLog(task.ID, "error", errStr)
		deploymentFailed = true
		return
	}

	streamLogs := func(r io.Reader, pipeName string) {
		scanner := bufio.NewScanner(r)
		for scanner.Scan() {
			line := scanner.Text()
			if line != "" {
				reportLog(task.ID, "info", line)
			}
		}
	}

	go streamLogs(stdout, "stdout")
	go streamLogs(stderr, "stderr")

	if err := buildCmd.Wait(); err != nil {
		errStr := fmt.Sprintf("Docker Build FAILED: %v", err)
		log.Println(errStr)
		reportLog(task.ID, "error", errStr)
		deploymentFailed = true
		return
	}
	reportLog(task.ID, "success", "Build completed successfully.")

	log.Println("Starting container...")
	reportLog(task.ID, "info", "Launching containerized service...")
	
	port := task.DockerConfig.ContainerPort
	if port == "" { port = "80" }

	// Prepare run arguments
	runArgs := []string{"run", "-d", "--name", containerName, "--network", "devops_proxy"}
	
	// Traefik Labels for dynamic routing
	hostRule := fmt.Sprintf("Host(`%s.localhost`)", strings.ToLower(task.RepoName))
	runArgs = append(runArgs, "--label", "traefik.enable=true")
	runArgs = append(runArgs, "--label", fmt.Sprintf("traefik.http.routers.%s.rule=%s", containerName, hostRule))
	runArgs = append(runArgs, "--label", fmt.Sprintf("traefik.http.services.%s.loadbalancer.server.port=%s", containerName, port))
	runArgs = append(runArgs, "--label", "traefik.http.routers."+containerName+".entrypoints=web")

	// Inject Env Vars
	for k, v := range task.EnvVars {
		runArgs = append(runArgs, "-e", fmt.Sprintf("%s=%s", k, v))
	}
	
	// Keep port mapping for local access as fallback
	runArgs = append(runArgs, "-p", fmt.Sprintf("%s:%s", port, port))
	
	// Image Name
	runArgs = append(runArgs, imageName)

	runCmd := exec.Command("docker", runArgs...)
	output, err := runCmd.CombinedOutput()
	if err != nil {
		errStr := fmt.Sprintf("Docker Run FAILED: %v", err)
		log.Println(errStr)
		reportLog(task.ID, "error", errStr)
		deploymentFailed = true
		return
	}
	
	reportLog(task.ID, "success", "Service is up and running.")
	
	containerID := strings.TrimSpace(string(output))
	shortID := containerID
	if len(containerID) > 12 {
		shortID = containerID[:12]
	}

	log.Printf("<<< Deployment SUCCESS: %s\n", task.RepoName)
	log.Printf("Container ID: %s\n", shortID)
	log.Printf("Service accessible at: http://localhost:%s\n", port)
	
	reportStatus(task.ID, "active", shortID)
}

