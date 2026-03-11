import psutil
import os
import time

class MetricsService:
    @staticmethod
    def get_system_metrics():
        # Get CPU Usage
        cpu_usage = psutil.cpu_percent(interval=None)
        
        # Get RAM Usage
        ram = psutil.virtual_memory()
        ram_usage_gb = round(ram.used / (1024 ** 3), 1)
        ram_total_gb = round(ram.total / (1024 ** 3), 1)
        ram_percent = ram.percent

        # Mock Bandwidth (since tracking real network diff requires state)
        # We'll just generate something realistic
        inbound = 420.5 # GB
        outbound = 780.2 # GB
        total_bandwidth = "1.2 TB"

        # Generate some historical CPU data for the chart (last 12 data points)
        # In a real app, this would come from a time-series DB like Prometheus or InfluxDB
        cpu_history = [20, 35, 45, 30, 55, 40, 65, 50, 45, 60, 32, cpu_usage]

        return {
            "cpu": {
                "current": cpu_usage,
                "history": cpu_history
            },
            "ram": {
                "used_gb": ram_usage_gb,
                "total_gb": ram_total_gb,
                "percent": ram_percent
            },
            "bandwidth": {
                "inbound_gb": inbound,
                "outbound_gb": outbound,
                "total": total_bandwidth,
                "inbound_percent": 45,
                "outbound_percent": 70
            }
        }
