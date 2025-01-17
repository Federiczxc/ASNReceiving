from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import pytesseract
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Configure upload folder
UPLOAD_FOLDER = './uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


@app.route('/ocr', methods=['POST'])
def ocr():
    # Check if a file is part of the request
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['image']

    # Secure the filename and save it
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    try:
        # Open the image using Pillow
        image = Image.open(file_path)
        
        # Perform OCR using pytesseract
        text = pytesseract.image_to_string(image)

        # Clean up the uploaded file
        os.remove(file_path)

        return jsonify({'text': text})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
