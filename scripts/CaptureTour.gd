extends Node

func _ready() -> void:
	print("--- STARTING CAPTURE TOUR ---")
	capture_sequence()

func capture_sequence() -> void:
	var player = get_tree().get_first_node_in_group("player")
	
	# 1. Capture 1st person vue initiale
	await get_tree().create_timer(1.2).timeout
	save_screen("screenshot_tour_1_fp.png")
	
	# 2. Tourner vers l'armoire Bott et avancer un peu
	if player:
		player.global_position = Vector3(2.5, 0.0, 3.5)
		var cam = player.get_node_or_null("Head")
		if cam:
			cam.rotation_degrees = Vector3(-10, -30, 0)
	await get_tree().create_timer(0.6).timeout
	save_screen("screenshot_tour_2_cabinet.png")
	
	# 3. Ouvrir le tiroir et inspecter les brides KF40
	var cabinet = get_tree().get_first_node_in_group("scannable")
	if cabinet and cabinet.has_method("open_drawer"):
		cabinet.open_drawer()
	await get_tree().create_timer(1.0).timeout
	save_screen("screenshot_tour_3_drawer.png")
	
	# 4. Fermer tiroir et basculer en vue 3ème personne (V)
	if cabinet and cabinet.has_method("close_drawer"):
		cabinet.close_drawer()
	if player and player.has_method("toggle_camera_perspective"):
		player.toggle_camera_perspective()
		player.global_position = Vector3(0.0, 0.0, 0.0)
		var arm = player.get_node_or_null("ThirdPersonArm")
		if arm:
			arm.rotation_degrees = Vector3(-15, 0, 0)
	await get_tree().create_timer(1.0).timeout
	save_screen("screenshot_tour_4_operator_3p.png")

	print("--- CAPTURE TOUR COMPLETED ---")
	get_tree().quit()

func save_screen(filename: String) -> void:
	var img = get_viewport().get_texture().get_image()
	if img:
		img.save_png("res://" + filename)
		print("[OK] Saved: " + filename)
