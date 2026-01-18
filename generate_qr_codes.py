import qrcode
import os
from PIL import Image, ImageDraw, ImageFont

def generate_table_qr_codes(base_url="http://localhost:8080", num_tables=20):
    """Generate QR codes for table numbers"""
    
    # Create QR codes directory
    os.makedirs('qr_codes', exist_ok=True)
    
    for table_num in range(1, num_tables + 1):
        # Create QR code URL
        url = f"{base_url}?table={table_num}"
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)
        
        # Create QR code image
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Create a larger image with table number
        img_width = 300
        img_height = 350
        final_img = Image.new('RGB', (img_width, img_height), 'white')
        
        # Paste QR code
        qr_size = 250
        qr_img = qr_img.resize((qr_size, qr_size))
        final_img.paste(qr_img, ((img_width - qr_size) // 2, 20))
        
        # Add table number text
        draw = ImageDraw.Draw(final_img)
        try:
            font = ImageFont.truetype("arial.ttf", 24)
        except:
            font = ImageFont.load_default()
        
        text = f"TABLE {table_num}"
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_x = (img_width - text_width) // 2
        draw.text((text_x, 280), text, fill="black", font=font)
        
        # Add URL text
        try:
            small_font = ImageFont.truetype("arial.ttf", 12)
        except:
            small_font = ImageFont.load_default()
        
        url_text = url
        url_bbox = draw.textbbox((0, 0), url_text, font=small_font)
        url_width = url_bbox[2] - url_bbox[0]
        url_x = (img_width - url_width) // 2
        draw.text((url_x, 315), url_text, fill="gray", font=small_font)
        
        # Save image
        filename = f"qr_codes/table_{table_num:02d}.png"
        final_img.save(filename)
        print(f"Generated QR code for Table {table_num}: {filename}")

if __name__ == "__main__":
    print("Generating QR codes for tables...")
    generate_table_qr_codes()
    print("QR codes generated successfully!")
    print("You can print these QR codes and place them on your tables.")