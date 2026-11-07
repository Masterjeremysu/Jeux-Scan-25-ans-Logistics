@tool
extends SceneTree

func _init() -> void:
	print("--- GÉNÉRATION DES TEXTURES DU JEU ---")
	var dir = DirAccess.open("res://")
	if not dir.dir_exists("textures"):
		dir.make_dir("textures")

	generate_epoxy_floor()
	generate_hazard_stripes()
	generate_corrugated_wall()
	generate_wood_pallet()
	generate_cardboard_box()
	generate_ean128_label()
	generate_cea_logo_badge()
	generate_zebra_body_texture()
	print("--- TEXTURES GÉNÉRÉES AVEC SUCCÈS DANS res://textures/ ---")
	quit()

# 1. Sol époxy résiné brillant avec joints de dilatation et reflets
func generate_epoxy_floor() -> void:
	var w = 1024
	var h = 1024
	var img = Image.create(w, h, false, Image.FORMAT_RGBA8)
	
	for y in range(h):
		for x in range(w):
			# Base béton résiné bleu/gris industriel
			var n1 = sin(x * 0.05) * cos(y * 0.05) * 0.02
			var n2 = (sin(x * 0.2 + y * 0.1) * 0.015)
			var gray = 0.22 + n1 + n2
			var col = Color(gray * 0.88, gray * 0.95, gray * 1.08)
			
			# Joints de dalle tous les 256 pixels
			if x % 256 < 3 or y % 256 < 3:
				col = Color(0.10, 0.12, 0.15)
			
			# Marques de sécurité / lignes de circulation tous les 512 pixels
			if (y % 512 >= 10 and y % 512 <= 22) or (x % 512 >= 10 and x % 512 <= 22):
				col = Color(0.92, 0.76, 0.12) # Peinture jaune de sécurité
				
			img.set_pixel(x, y, col)
			
	img.save_png("res://textures/floor_epoxy.png")
	print("✓ floor_epoxy.png (1024x1024)")

# 2. Bandes hachurées jaune et noir de sécurité (norme ISO / OSHA)
func generate_hazard_stripes() -> void:
	var w = 256
	var h = 256
	var img = Image.create(w, h, false, Image.FORMAT_RGBA8)
	for y in range(h):
		for x in range(w):
			var stripe = (x + y) % 64 < 32
			var col = Color(0.96, 0.74, 0.05) if stripe else Color(0.11, 0.12, 0.14)
			img.set_pixel(x, y, col)
	img.save_png("res://textures/hazard_stripes.png")
	print("✓ hazard_stripes.png")

# 3. Bardage tôle ondulée avec ombrage et rivets
func generate_corrugated_wall() -> void:
	var w = 512
	var h = 512
	var img = Image.create(w, h, false, Image.FORMAT_RGBA8)
	for y in range(h):
		for x in range(w):
			var wave = sin(x * (PI * 2.0 / 64.0)) * 0.18
			var base = 0.38 + wave
			var col = Color(base * 0.92, base * 0.96, base * 1.02)
			
			# Ligne d'assemblage horizontale tous les 256 pixels
			if y % 256 < 4:
				col = Color(0.18, 0.20, 0.24)
			# Rivets réguliers le long de l'assemblage
			if (y % 256 < 8 and y % 256 > 1) and (x % 32 < 4):
				col = Color(0.65, 0.68, 0.72)
				
			img.set_pixel(x, y, col)
	img.save_png("res://textures/wall_corrugated.png")
	print("✓ wall_corrugated.png")

# 4. Planches de bois pour palettes Euro (EPAL)
func generate_wood_pallet() -> void:
	var w = 512
	var h = 512
	var img = Image.create(w, h, false, Image.FORMAT_RGBA8)
	for y in range(h):
		for x in range(w):
			var grain = sin(y * 0.8 + sin(x * 0.05) * 4.0) * 0.04
			var r = 0.68 + grain
			var g = 0.52 + grain * 0.8
			var b = 0.34 + grain * 0.6
			
			# Fentes entre planches de palette
			if y % 128 < 4:
				r *= 0.35; g *= 0.35; b *= 0.35
				
			img.set_pixel(x, y, Color(r, g, b))
	img.save_png("res://textures/wood_pallet.png")
	print("✓ wood_pallet.png")

# 5. Carton Kraft avec marquages et flèches de manutention CEA
func generate_cardboard_box() -> void:
	var w = 512
	var h = 512
	var img = Image.create(w, h, false, Image.FORMAT_RGBA8)
	for y in range(h):
		for x in range(w):
			var fiber = (sin(x * 0.3) * cos(y * 0.3) * 0.02)
			var col = Color(0.72 + fiber, 0.54 + fiber * 0.9, 0.32 + fiber * 0.7)
			
			# Ruban adhésif marron brillant au milieu
			if x >= 230 and x <= 282:
				col = Color(0.48, 0.32, 0.16)
				
			# Étiquette blanche CEA collée sur le carton
			if x >= 40 and x <= 210 and y >= 80 and y <= 240:
				col = Color(0.96, 0.96, 0.94)
				# Lignes de texte et code barre simulé sur l'étiquette
				if (y >= 100 and y <= 112) or (y >= 124 and y <= 130) or (y >= 140 and y <= 146):
					col = Color(0.15, 0.15, 0.15)
				# Barcode EAN sur l'étiquette
				if y >= 170 and y <= 220 and x >= 55 and x <= 195:
					var bar = (x * 7 + y) % 6 < 3
					col = Color(0.08, 0.08, 0.08) if bar else Color(0.96, 0.96, 0.94)
					
			img.set_pixel(x, y, col)
	img.save_png("res://textures/cardboard_box.png")
	print("✓ cardboard_box.png")

# 6. Étiquette EAN-128 industrielle haute résolution pour tiroir
func generate_ean128_label() -> void:
	var w = 512
	var h = 256
	var img = Image.create(w, h, false, Image.FORMAT_RGBA8)
	img.fill(Color(0.98, 0.98, 0.97)) # Fond blanc vinyle
	
	for y in range(h):
		for x in range(w):
			# Cadre noir de bordure
			if x < 6 or x > w - 7 or y < 6 or y > h - 7:
				img.set_pixel(x, y, Color(0.1, 0.1, 0.1))
				continue
				
			# Bandeau supérieur jaune CEA Minatec
			if y >= 6 and y <= 45:
				img.set_pixel(x, y, Color(0.96, 0.65, 0.08))
				continue
				
			# Barres Code-128 (zone de y=110 à y=210)
			if y >= 105 and y <= 215 and x >= 35 and x <= 477:
				# Simulation de barres EAN-128 avec largeurs variables
				var bar_pattern = ((x * 13) ^ (x / 7)) % 11 < 5
				if bar_pattern:
					img.set_pixel(x, y, Color(0.05, 0.05, 0.05))
					
	img.save_png("res://textures/label_ean128.png")
	print("✓ label_ean128.png")

# 7. Badge / Logo CEA pour le Zebra et les panneaux
func generate_cea_logo_badge() -> void:
	var w = 256
	var h = 128
	var img = Image.create(w, h, false, Image.FORMAT_RGBA8)
	img.fill(Color(0.08, 0.12, 0.18))
	for y in range(h):
		for x in range(w):
			if x < 4 or x > w - 5 or y < 4 or y > h - 5:
				img.set_pixel(x, y, Color(0.02, 0.45, 0.85))
	img.save_png("res://textures/cea_badge.png")
	print("✓ cea_badge.png")

# 8. Texture texturée carbone/gomme antidérapante pour le Zebra TC5x
func generate_zebra_body_texture() -> void:
	var w = 256
	var h = 256
	var img = Image.create(w, h, false, Image.FORMAT_RGBA8)
	for y in range(h):
		for x in range(w):
			var knurl = (x % 6 < 3) == (y % 6 < 3)
			var base = 0.14 if knurl else 0.11
			img.set_pixel(x, y, Color(base, base + 0.01, base + 0.02))
	img.save_png("res://textures/zebra_rubber_grip.png")
	print("✓ zebra_rubber_grip.png")
