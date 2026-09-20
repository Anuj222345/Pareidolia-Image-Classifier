import os
import io
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# Device Configuration
device = torch.device('cpu')

# ResNet50 Architecture Initialization
def load_model(weights_path='resnet50_pareidolia.pth'):
    model = models.resnet50(weights=None)
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, 2)
    
    if os.path.exists(weights_path):
        model.load_state_dict(torch.load(weights_path, map_location=device))
        print(f"Loaded trained weights from {weights_path}")
    else:
        print(f"Weights file {weights_path} not found. Running with default initialized weights.")
        
    model = model.to(device)
    model.eval()
    return model

model = load_model()

# Image Transformation Pipeline
eval_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

def rotate_image(image, angle):
    """Counter-clockwise normalization rotation."""
    return image.rotate(-angle, expand=True)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
        
    file = request.files['image']
    azimuth_angle = float(request.form.get('azimuth_angle', 0.0))
    
    try:
        # Open and convert image to RGB
        image = Image.open(io.BytesIO(file.read())).convert('RGB')
        
        # Apply illumination normalization
        if azimuth_angle != 0:
            image = rotate_image(image, azimuth_angle)
            
        # Apply tensor transformations
        tensor = eval_transform(image).unsqueeze(0).to(device)
        
        # Inference
        with torch.no_grad():
            outputs = model(tensor)
            probabilities = torch.softmax(outputs, dim=1)[0].cpu().numpy()
            prediction = int(torch.argmax(outputs, dim=1).item())
            
        return jsonify({
            'success': True,
            'prediction': prediction,
            'class_label': f"Class {prediction}",
            'confidence': float(probabilities[prediction]),
            'probabilities': {
                'class_0': float(probabilities[0]),
                'class_1': float(probabilities[1])
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
