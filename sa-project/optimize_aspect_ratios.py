import os
import json
import subprocess
import argparse
import re
from datetime import datetime
import shutil

# Aspect ratios to test
ASPECT_RATIOS = {
    "1:4": (500, 2000),   # 1:4 aspect ratio
    "1:2": (500, 1000),   # 1:2 aspect ratio
    "1:1": (1000, 1000),  # 1:1 aspect ratio
    "2:1": (1000, 500),   # 2:1 aspect ratio (current default)
    "4:1": (2000, 500)    # 4:1 aspect ratio
}

def modify_sa_worker(width, height):
    """
    Modify the sa_worker.js file to use the specified width and height
    """
    with open("sa_worker.js", "r") as f:
        content = f.read()
    
    # Replace the width and height values
    # Look for the line with the comment about these values being replaced
    width_pattern = r"const width = \d+;//描画範囲横幅"
    height_pattern = r"const height = \d+;//描画範囲縦幅"
    
    content = re.sub(width_pattern, f"const width = {width};//描画範囲横幅", content)
    content = re.sub(height_pattern, f"const height = {height};//描画範囲縦幅", content)
    
    # Create a backup of the original file
    backup_file = "sa_worker.js.bak"
    if not os.path.exists(backup_file):
        shutil.copy("sa_worker.js", backup_file)
    
    # Write the modified content
    with open("sa_worker.js", "w") as f:
        f.write(content)

def restore_sa_worker():
    """
    Restore the sa_worker.js file from backup
    """
    backup_file = "sa_worker.js.bak"
    if os.path.exists(backup_file):
        shutil.copy(backup_file, "sa_worker.js")
        os.remove(backup_file)

def run_optimization(aspect_ratio, width, height, n_trials):
    """
    Run the optimization for a specific aspect ratio
    """
    print(f"\n{'='*50}")
    print(f"Running optimization for aspect ratio {aspect_ratio} ({width}x{height})")
    print(f"{'='*50}\n")
    
    # Modify the sa_worker.js file
    modify_sa_worker(width, height)
    
    # Create a timestamp for this run
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create a directory for this aspect ratio
    results_dir = f"results_{aspect_ratio.replace(':', '_')}_{timestamp}"
    
    # Run the optimization
    cmd = ["python3.10", "optimaize.py", "--trials", str(n_trials)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Print the output
    print(result.stdout)
    if result.stderr:
        print(f"Error: {result.stderr}")
    
    # Move the results to the aspect ratio directory
    latest_results = None
    for item in os.listdir("."):
        if item.startswith("results_") and os.path.isdir(item) and item != results_dir:
            if not latest_results or os.path.getmtime(item) > os.path.getmtime(latest_results):
                latest_results = item
    
    if latest_results:
        # Rename the directory to include the aspect ratio
        os.rename(latest_results, results_dir)
        
        # Add aspect ratio information to the best_params.json file
        best_params_file = os.path.join(results_dir, "best_params.json")
        if os.path.exists(best_params_file):
            with open(best_params_file, "r") as f:
                best_params = json.load(f)
            
            # Add aspect ratio information
            best_params["aspect_ratio"] = aspect_ratio
            best_params["width"] = width
            best_params["height"] = height
            
            with open(best_params_file, "w") as f:
                json.dump(best_params, f, indent=2)
    
    return results_dir

def create_comparison_report(results_dirs):
    """
    Create a comparison report of the results from different aspect ratios
    """
    print("\nCreating comparison report...")
    
    # Create a timestamp for the report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_dir = f"aspect_ratio_comparison_{timestamp}"
    os.makedirs(report_dir, exist_ok=True)
    
    # Collect the best parameters for each aspect ratio
    comparison_data = {}
    
    for results_dir in results_dirs:
        best_params_file = os.path.join(results_dir, "best_params.json")
        if os.path.exists(best_params_file):
            with open(best_params_file, "r") as f:
                best_params = json.load(f)
            
            aspect_ratio = best_params.get("aspect_ratio", "unknown")
            comparison_data[aspect_ratio] = {
                "best_value": best_params["best_value"],
                "params": best_params["params"],
                "width": best_params.get("width", 0),
                "height": best_params.get("height", 0)
            }
            
            # Copy the visualization files
            for file in os.listdir(results_dir):
                if file.endswith(".png") or file.endswith(".html"):
                    src = os.path.join(results_dir, file)
                    dst = os.path.join(report_dir, f"{aspect_ratio.replace(':', '_')}_{file}")
                    shutil.copy(src, dst)
    
    # Create a comparison JSON file
    comparison_file = os.path.join(report_dir, "aspect_ratio_comparison.json")
    with open(comparison_file, "w") as f:
        json.dump(comparison_data, f, indent=2)
    
    # Create a comparison HTML file
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Aspect Ratio Comparison</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .section { margin-bottom: 30px; }
            .image-container { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px; }
            .image-item { flex: 1; min-width: 300px; max-width: 100%; }
            .image-item img { max-width: 100%; height: auto; }
            .image-item h3 { margin-top: 0; }
        </style>
    </head>
    <body>
        <h1>Aspect Ratio Comparison</h1>
        
        <div class="section">
            <h2>Best Parameters by Aspect Ratio</h2>
            <table>
                <tr>
                    <th>Aspect Ratio</th>
                    <th>Best Value</th>
                    <th>Width</th>
                    <th>Height</th>
                    <th>Initial Temp</th>
                    <th>Final Temp</th>
                    <th>Cooling Rate</th>
                    <th>Iterations Per Temp</th>
                </tr>
    """
    
    # Add rows for each aspect ratio
    for aspect_ratio, data in comparison_data.items():
        params = data["params"]
        html_content += f"""
                <tr>
                    <td>{aspect_ratio}</td>
                    <td>{data["best_value"]:.6f}</td>
                    <td>{data["width"]}</td>
                    <td>{data["height"]}</td>
                    <td>{params.get("initialTemp", "N/A"):.6f}</td>
                    <td>{params.get("finalTemp", "N/A"):.6f}</td>
                    <td>{params.get("coolingRate", "N/A"):.6f}</td>
                    <td>{params.get("iterations_per_temp", "N/A")}</td>
                </tr>
        """
    
    html_content += """
            </table>
        </div>
        
        <div class="section">
            <h2>Optimization History</h2>
            <div class="image-container">
    """
    
    # Add optimization history images
    for aspect_ratio in comparison_data.keys():
        ar_safe = aspect_ratio.replace(':', '_')
        html_content += f"""
                <div class="image-item">
                    <h3>{aspect_ratio}</h3>
                    <img src="{ar_safe}_optimization_history.png" alt="Optimization History for {aspect_ratio}">
                </div>
        """
    
    html_content += """
            </div>
        </div>
        
        <div class="section">
            <h2>Parameter Distributions</h2>
            <div class="image-container">
    """
    
    # Add parameter distribution images
    for aspect_ratio in comparison_data.keys():
        ar_safe = aspect_ratio.replace(':', '_')
        html_content += f"""
                <div class="image-item">
                    <h3>{aspect_ratio}</h3>
                    <img src="{ar_safe}_parameter_distributions.png" alt="Parameter Distributions for {aspect_ratio}">
                </div>
        """
    
    html_content += """
            </div>
        </div>
        
        <div class="section">
            <h2>Parallel Coordinates</h2>
            <div class="image-container">
    """
    
    # Add parallel coordinates images
    for aspect_ratio in comparison_data.keys():
        ar_safe = aspect_ratio.replace(':', '_')
        html_content += f"""
                <div class="image-item">
                    <h3>{aspect_ratio}</h3>
                    <img src="{ar_safe}_parallel_coordinates.png" alt="Parallel Coordinates for {aspect_ratio}">
                </div>
        """
    
    html_content += """
            </div>
        </div>
    </body>
    </html>
    """
    
    # Write the HTML file
    html_file = os.path.join(report_dir, "aspect_ratio_comparison.html")
    with open(html_file, "w") as f:
        f.write(html_content)
    
    print(f"Comparison report created in {report_dir}")
    return report_dir

def main():
    parser = argparse.ArgumentParser(description="Optimize SA parameters for different aspect ratios")
    parser.add_argument("--trials", type=int, default=50, help="Number of trials per aspect ratio")
    args = parser.parse_args()
    
    try:
        # Run optimization for each aspect ratio
        results_dirs = []
        for aspect_ratio, (width, height) in ASPECT_RATIOS.items():
            results_dir = run_optimization(aspect_ratio, width, height, args.trials)
            results_dirs.append(results_dir)
        
        # Create a comparison report
        report_dir = create_comparison_report(results_dirs)
        
        print(f"\nAll optimizations completed. Results are in:")
        for results_dir in results_dirs:
            print(f"- {results_dir}")
        print(f"Comparison report: {report_dir}/aspect_ratio_comparison.html")
        
    finally:
        # Restore the original sa_worker.js file
        restore_sa_worker()

if __name__ == "__main__":
    main()
