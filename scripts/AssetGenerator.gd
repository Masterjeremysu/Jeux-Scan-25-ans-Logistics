@tool
extends Node

class_name AssetGenerator

# Génère une texture de sol béton résiné avec lignes de dilatation et reflets
static func create_epoxy_floor_texture() -> ImageTexture:
	var img = Image.create(512, 512, false, Image.FORMAT_RGBA8)
	img.fill(Color(0.24, 0.28, 0.35))
	
	# Bruit de texture béton
	for x in range(512):
		for y in range(512):
			var n = (sin(x * 0.1) * cos(y * 0.1) * 0.03) + (randf() * 0.04 - 0.02)
			var base = Color(0.25 + n, 0.29 + n, 0.36 + n)
			
			# Joints de dalles tous les 128 pixels
			if x % 128 < 2 or y % 128 < 2:
				base = Color(0.12, 0.14, 0.18)
			
			img.set_pixel(x, y, base)
			
	return ImageTexture.create_from_image(img)

# Génère une texture de bardage tôle ondulée industrielle pour les murs
static func create_corrugated_wall_texture() -> ImageTexture:
	var img = Image.create(256, 256, false, Image.FORMAT_RGBA8)
	for x in range(256):
		var ondulation = sin(x * 0.25) * 0.12
		var col = Color(0.42 + ondulation, 0.46 + ondulation, 0.52 + ondulation)
		for y in range(256):
			# Rivets réguliers
			if y % 64 < 3 and x % 16 < 3:
				img.set_pixel(x, y, Color(0.25, 0.28, 0.32))
			else:
				img.set_pixel(x, y, col)
	return ImageTexture.create_from_image(img)

# Texture de bande de sécurité hachurée jaune et noire
static func create_hazard_stripe_texture() -> ImageTexture:
	var img = Image.create(128, 128, false, Image.FORMAT_RGBA8)
	for x in range(128):
		for y in range(128):
			var stripe = (x + y) % 32 < 16
			img.set_pixel(x, y, Color(0.96, 0.72, 0.05) if stripe else Color(0.1, 0.1, 0.12))
	return ImageTexture.create_from_image(img)
