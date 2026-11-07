@tool
extends SceneTree

func _init() -> void:
	print("--- GÉNÉRATION DES TEXTURES PBR AAA (ALBEDO, NORMAL, ROUGHNESS) ---")
	var dir = DirAccess.open("res://")
	if not dir.dir_exists("textures"):
		dir.make_dir("textures")

	generate_pbr_corrugated_wall()
	generate_pbr_wood_pallet()
	generate_pbr_epoxy_floor()
	generate_pbr_rack_metal()
	generate_pbr_cardboard()
	print("--- GÉNÉRATION TERMINÉE ---")
	quit()

# Fonction utilitaire pour convertir un heightmap (Image FORMAT_RF ou FORMAT_R8) en Normal Map RGB
func heightmap_to_normal_map(h_img: Image, strength: float = 2.0) -> Image:
	var w = h_img.get_width()
	var h = h_img.get_height()
	var n_img = Image.create(w, h, false, Image.FORMAT_RGBA8)
	
	for y in range(h):
		var y_prev = (y - 1 + h) % h
		var y_next = (y + 1) % h
		for x in range(w):
			var x_prev = (x - 1 + w) % w
			var x_next = (x + 1) % w
			
			var h_l = h_img.get_pixel(x_prev, y).r
			var h_r = h_img.get_pixel(x_next, y).r
			var h_u = h_img.get_pixel(x, y_prev).r
			var h_d = h_img.get_pixel(x, y_next).r
			
			var dx = (h_l - h_r) * strength
			var dy = (h_u - h_d) * strength
			var dz = 1.0
			var len = sqrt(dx * dx + dy * dy + dz * dz)
			dx /= len; dy /= len; dz /= len
			
			# Mapper de [-1, 1] vers [0, 1]
			var nx = dx * 0.5 + 0.5
			var ny = dy * 0.5 + 0.5
			var nz = dz * 0.5 + 0.5
			n_img.set_pixel(x, y, Color(nx, ny, nz, 1.0))
			
	return n_img

# 1. Bardage tôle ondulée avec vrai relief 3D (Normal Map) et rugosité
func generate_pbr_corrugated_wall() -> void:
	var w = 512
	var h = 512
	var albedo = Image.create(w, h, false, Image.FORMAT_RGBA8)
	var height = Image.create(w, h, false, Image.FORMAT_R8)
	var rough = Image.create(w, h, false, Image.FORMAT_R8)
	
	for y in range(h):
		for x in range(w):
			# Onde sinusoïdale de bardage industriel (période 64 pixels)
			var angle = x * (TAU / 64.0)
			var wave = sin(angle) * 0.5 + 0.5 # 0 à 1
			
			# Micro-bruit de texture métal
			var noise = (sin(x * 0.5 + y * 0.3) * 0.03) + (randf() * 0.02)
			
			# Hauteur pour normal map
			var h_val = clamp(wave + noise, 0.0, 1.0)
			
			# Lignes de rivets et jonctions de plaques tous les 256 pixels
			var is_seam = y % 256 < 4
			var is_rivet = (y % 256 >= 4 and y % 256 <= 12) and (x % 32 < 6)
			
			if is_rivet:
				h_val = 0.95
			elif is_seam:
				h_val = 0.1
				
			height.set_pixel(x, y, Color(h_val, h_val, h_val))
			
			# Albedo : Métal gris bleuté industriel d'usine
			var base_gray = 0.42 + wave * 0.12 + noise
			var col = Color(base_gray * 0.92, base_gray * 0.96, base_gray * 1.04)
			if is_seam:
				col = Color(0.18, 0.20, 0.24)
			elif is_rivet:
				col = Color(0.65, 0.68, 0.72)
			albedo.set_pixel(x, y, col)
			
			# Roughness : Métal satiné (0.35 sur les crêtes, 0.55 dans les creux)
			var r_val = 0.35 + (1.0 - wave) * 0.20
			if is_rivet: r_val = 0.20
			rough.set_pixel(x, y, Color(r_val, r_val, r_val))
			
	var normal = heightmap_to_normal_map(height, 3.5)
	albedo.save_png("res://textures/wall_albedo.png")
	normal.save_png("res://textures/wall_normal.png")
	rough.save_png("res://textures/wall_roughness.png")
	print("✓ Mur PBR (Albedo, Normal, Roughness)")

# 2. Palette Euro bois avec vraies veines de pin, joints de planches et clous
func generate_pbr_wood_pallet() -> void:
	var w = 512
	var h = 512
	var albedo = Image.create(w, h, false, Image.FORMAT_RGBA8)
	var height = Image.create(w, h, false, Image.FORMAT_R8)
	var rough = Image.create(w, h, false, Image.FORMAT_R8)
	
	for y in range(h):
		for x in range(w):
			# Veinage du bois naturel
			var grain = sin(y * 0.15 + sin(x * 0.04) * 8.0) * 0.08
			var fine_grain = sin(y * 1.2 + sin(x * 0.1) * 3.0) * 0.03
			var wood_h = 0.5 + grain + fine_grain
			
			# Rainures entre les planches (tous les 102 pixels)
			var is_gap = y % 102 < 6
			if is_gap:
				wood_h = 0.1
				
			# Clous réguliers sur les traverses
			var is_nail = (x % 170 >= 18 and x % 170 <= 26) and (y % 102 >= 18 and y % 102 <= 26)
			if is_nail:
				wood_h = 0.85
				
			height.set_pixel(x, y, Color(wood_h, wood_h, wood_h))
			
			# Albedo bois brut de palette pin naturel
			var r = 0.72 + grain * 1.2
			var g = 0.56 + grain * 0.9
			var b = 0.38 + grain * 0.6
			if is_gap:
				r *= 0.25; g *= 0.25; b *= 0.25
			elif is_nail:
				r = 0.28; g = 0.30; b = 0.32 # Tête de clou acier rouillé
			
			# Marquage au fer chaud "EPAL" sur un bloc
			if x >= 30 and x <= 140 and y >= 320 and y <= 380 and not is_gap:
				r *= 0.55; g *= 0.45; b *= 0.35
				
			albedo.set_pixel(x, y, Color(r, g, b))
			
			# Roughness : Bois rugueux 0.80, clous brillants 0.30
			var r_val = 0.30 if is_nail else 0.82
			rough.set_pixel(x, y, Color(r_val, r_val, r_val))
			
	var normal = heightmap_to_normal_map(height, 2.5)
	albedo.save_png("res://textures/wood_albedo.png")
	normal.save_png("res://textures/wood_normal.png")
	rough.save_png("res://textures/wood_roughness.png")
	print("✓ Palette Bois PBR (Albedo, Normal, Roughness)")

# 3. Sol époxy lustré avec micro-relief, joints et traces de chariots
func generate_pbr_epoxy_floor() -> void:
	var w = 1024
	var h = 1024
	var albedo = Image.create(w, h, false, Image.FORMAT_RGBA8)
	var height = Image.create(w, h, false, Image.FORMAT_R8)
	var rough = Image.create(w, h, false, Image.FORMAT_R8)
	
	for y in range(h):
		for x in range(w):
			# Base béton résiné époxy
			var micro = (sin(x * 0.1) * cos(y * 0.1) * 0.015)
			var h_val = 0.5 + micro
			
			# Joint de dilatation tous les 256 pixels
			var is_joint = x % 256 < 4 or y % 256 < 4
			if is_joint:
				h_val = 0.15
				
			# Bande de sécurité jaune
			var is_stripe = (y % 512 >= 16 and y % 512 <= 36) or (x % 512 >= 16 and x % 512 <= 36)
			if is_stripe and not is_joint:
				h_val = 0.58 # Surépaisseur de peinture
				
			height.set_pixel(x, y, Color(h_val, h_val, h_val))
			
			# Albedo
			var gray = 0.24 + micro
			var col = Color(gray * 0.90, gray * 0.96, gray * 1.06) # Gris anthracite teinté
			if is_joint:
				col = Color(0.08, 0.09, 0.11)
			elif is_stripe:
				col = Color(0.95, 0.74, 0.08) # Jaune signalétique
			albedo.set_pixel(x, y, col)
			
			# Roughness : Sol époxy très brillant (reflets nets type miroir satiné 0.18)
			var r_val = 0.18
			if is_joint: r_val = 0.85
			elif is_stripe: r_val = 0.38
			# Traces de pneus de chariots élévateurs
			if abs((x + y * 0.3) - 400) < 12 or abs((x - y * 0.2) - 700) < 14:
				r_val = 0.45
			rough.set_pixel(x, y, Color(r_val, r_val, r_val))
			
	var normal = heightmap_to_normal_map(height, 2.0)
	albedo.save_png("res://textures/floor_albedo.png")
	normal.save_png("res://textures/floor_normal.png")
	rough.save_png("res://textures/floor_roughness.png")
	print("✓ Sol Époxy PBR (Albedo, Normal, Roughness)")

# 4. Acier laqué industriel pour racks avec perforations découpées au laser
func generate_pbr_rack_metal() -> void:
	var w = 256
	var h = 512
	var albedo = Image.create(w, h, false, Image.FORMAT_RGBA8)
	var height = Image.create(w, h, false, Image.FORMAT_R8)
	var rough = Image.create(w, h, false, Image.FORMAT_R8)
	
	for y in range(h):
		for x in range(w):
			var h_val = 0.6
			# Trous rectangulaires de rack tous les 64 pixels verticaux
			var is_hole = (y % 64 >= 18 and y % 64 <= 46) and (abs(x - 128) < 28)
			if is_hole:
				h_val = 0.05
				
			height.set_pixel(x, y, Color(h_val, h_val, h_val))
			
			var col = Color(0.12, 0.38, 0.76) # Bleu rack industriel
			if is_hole:
				col = Color(0.04, 0.05, 0.08)
			albedo.set_pixel(x, y, col)
			
			var r_val = 0.90 if is_hole else 0.32
			rough.set_pixel(x, y, Color(r_val, r_val, r_val))
			
	var normal = heightmap_to_normal_map(height, 4.0)
	albedo.save_png("res://textures/rack_albedo.png")
	normal.save_png("res://textures/rack_normal.png")
	rough.save_png("res://textures/rack_roughness.png")
	print("✓ Métal Rack PBR (Albedo, Normal, Roughness)")

# 5. Carton ondulé avec fibres, ruban adhésif marron brillant et étiquette CEA
func generate_pbr_cardboard() -> void:
	var w = 512
	var h = 512
	var albedo = Image.create(w, h, false, Image.FORMAT_RGBA8)
	var height = Image.create(w, h, false, Image.FORMAT_R8)
	var rough = Image.create(w, h, false, Image.FORMAT_R8)
	
	for y in range(h):
		for x in range(w):
			var flute = sin(y * (TAU / 8.0)) * 0.03
			var h_val = 0.5 + flute
			
			# Ruban adhésif marron au milieu
			var is_tape = x >= 235 and x <= 277
			if is_tape:
				h_val = 0.62
				
			# Étiquette expédition CEA collée
			var is_label = x >= 45 and x <= 215 and y >= 85 and y <= 245
			if is_label:
				h_val = 0.60
				
			height.set_pixel(x, y, Color(h_val, h_val, h_val))
			
			var col = Color(0.74, 0.56, 0.34) # Papier Kraft
			var r_val = 0.88 # Mat
			
			if is_tape:
				col = Color(0.48, 0.32, 0.16)
				r_val = 0.22 # Adhésif vinyle brillant
			elif is_label:
				col = Color(0.96, 0.96, 0.94)
				r_val = 0.45
				# Logo CEA et mentions
				if (y >= 105 and y <= 118) or (y >= 130 and y <= 138):
					col = Color(0.12, 0.14, 0.18)
				# Barcode EAN
				if y >= 170 and y <= 225 and x >= 60 and x <= 200:
					var bar = ((x * 11) ^ (y / 3)) % 7 < 4
					col = Color(0.06, 0.06, 0.06) if bar else Color(0.96, 0.96, 0.94)
					
			albedo.set_pixel(x, y, col)
			rough.set_pixel(x, y, Color(r_val, r_val, r_val))
			
	var normal = heightmap_to_normal_map(height, 3.0)
	albedo.save_png("res://textures/box_albedo.png")
	normal.save_png("res://textures/box_normal.png")
	rough.save_png("res://textures/box_roughness.png")
	print("✓ Carton PBR (Albedo, Normal, Roughness)")
