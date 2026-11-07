extends CharacterBody3D

class_name PlayerController

@export var walk_speed: float = 4.0
@export var sprint_speed: float = 6.8
@export var acceleration: float = 12.0
@export var friction: float = 10.0
@export var mouse_sensitivity: float = 0.0022
@export var gravity: float = 9.8

@onready var head: Node3D = $Head
@onready var first_person_camera: Camera3D = $Head/Camera3D
@onready var third_person_arm: SpringArm3D = $ThirdPersonArm
@onready var third_person_camera: Camera3D = $ThirdPersonArm/ThirdPersonCamera
@onready var operator_mesh: Node3D = $OperatorMesh
@onready var laser_ray: RayCast3D = $Head/LaserRay
@onready var zebra_tc5x: Node3D = $Head/ZebraHand3D
@onready var interact_prompt: Label = $CanvasLayer/InteractPrompt
@onready var zebra_tactile_hud: Control = $CanvasLayer/ZebraTactileOverlay

var is_third_person: bool = false
var is_tactile_mode: bool = false
var is_inspecting_drawer: bool = false
var is_aiming_zebra: bool = false

# Positionnement ergonomique du Zebra
var zebra_idle_pos := Vector3(0.24, -0.22, -0.38)
var zebra_idle_rot := Vector3(deg_to_rad(-8), deg_to_rad(-12), deg_to_rad(4))

var zebra_aim_base_pos := Vector3(0.0, -0.06, -0.26)
var zebra_aim_base_rot := Vector3(deg_to_rad(-3), 0, 0)

var sway_offset := Vector3.ZERO
var sway_rot_offset := Vector3.ZERO
var bobbing_time := 0.0
var camera_base_y := 0.0

var wrist_pitch := 0.0
var wrist_yaw := 0.0
var wrist_roll := 0.0

var original_camera_transform: Transform3D

func _ready() -> void:
	add_to_group("player")
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	if first_person_camera:
		camera_base_y = first_person_camera.position.y
		first_person_camera.current = true
	if third_person_arm:
		third_person_arm.add_excluded_object(get_rid())
	if third_person_camera:
		third_person_camera.current = false
	if operator_mesh:
		operator_mesh.visible = false
	if zebra_tactile_hud:
		zebra_tactile_hud.visible = false
	if interact_prompt:
		interact_prompt.visible = false
	if zebra_tc5x:
		zebra_tc5x.position = zebra_idle_pos
		zebra_tc5x.rotation = zebra_idle_rot

func _unhandled_input(event: InputEvent) -> void:
	if is_tactile_mode:
		if event.is_action_pressed("ui_focus_next") or event.is_action_pressed("ui_cancel"): # TAB ou Echap
			toggle_tactile_mode(false)
		return

	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED and not is_inspecting_drawer:
		if is_aiming_zebra:
			wrist_yaw -= event.relative.x * 0.003
			wrist_pitch -= event.relative.y * 0.003
			wrist_yaw = clamp(wrist_yaw, deg_to_rad(-45), deg_to_rad(45))
			wrist_pitch = clamp(wrist_pitch, deg_to_rad(-35), deg_to_rad(35))
			wrist_roll = -wrist_yaw * 0.3
		else:
			rotate_y(-event.relative.x * mouse_sensitivity)
			if is_third_person:
				third_person_arm.rotate_x(-event.relative.y * mouse_sensitivity)
				third_person_arm.rotation.x = clamp(third_person_arm.rotation.x, deg_to_rad(-55), deg_to_rad(45))
			else:
				head.rotate_x(-event.relative.y * mouse_sensitivity)
				head.rotation.x = clamp(head.rotation.x, deg_to_rad(-75), deg_to_rad(75))
			
			sway_offset.x = clamp(-event.relative.x * 0.0006, -0.035, 0.035)
			sway_offset.y = clamp(event.relative.y * 0.0006, -0.025, 0.025)
			sway_rot_offset.y = clamp(-event.relative.x * 0.0012, -0.12, 0.12)
			sway_rot_offset.x = clamp(-event.relative.y * 0.0012, -0.10, 0.10)

	# Basculer Vue 1ère Personne / 3ème Personne (Touche V)
	if event is InputEventKey and event.pressed and event.keycode == KEY_V:
		toggle_camera_perspective()

	# Mode Tactile Plein Écran Zebra (Touche TAB)
	if event is InputEventKey and event.pressed and event.keycode == KEY_TAB:
		toggle_tactile_mode(not is_tactile_mode)

	if event.is_action_pressed("ui_cancel"):
		if is_inspecting_drawer:
			exit_drawer_inspection()
		else:
			if Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
				Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
			else:
				Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

	# Viser / inspecter le Zebra au poignet (Clic Droit)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT and not is_inspecting_drawer:
		set_aiming_zebra(event.pressed)

	# Tir laser code-barres (Espace ou Clic Gauche)
	if event.is_action_pressed("laser_scan") and not is_inspecting_drawer and not is_tactile_mode:
		trigger_laser_scan()

func toggle_camera_perspective() -> void:
	is_third_person = not is_third_person
	if is_third_person:
		third_person_camera.current = true
		first_person_camera.current = false
		if operator_mesh: operator_mesh.visible = true
	else:
		first_person_camera.current = true
		third_person_camera.current = false
		if operator_mesh: operator_mesh.visible = false

func toggle_tactile_mode(active: bool) -> void:
	is_tactile_mode = active
	if zebra_tactile_hud:
		zebra_tactile_hud.visible = active
	if active:
		Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	else:
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func set_aiming_zebra(aiming: bool) -> void:
	is_aiming_zebra = aiming
	if not aiming:
		var tween = create_tween().set_parallel(true)
		tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tween.tween_property(self, "wrist_pitch", 0.0, 0.2)
		tween.tween_property(self, "wrist_yaw", 0.0, 0.2)
		tween.tween_property(self, "wrist_roll", 0.0, 0.2)

func _physics_process(delta: float) -> void:
	if is_inspecting_drawer or is_tactile_mode:
		return

	if not is_on_floor():
		velocity.y -= gravity * delta

	# Sprint avec Shift
	var is_sprinting = Input.is_key_pressed(KEY_SHIFT) and not is_aiming_zebra
	var target_speed = sprint_speed if is_sprinting else walk_speed

	# Support Z/Q/S/D + W/A/S/D + Flèches
	var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
	var target_dir := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()

	if target_dir:
		velocity.x = lerpf(velocity.x, target_dir.x * target_speed, delta * acceleration)
		velocity.z = lerpf(velocity.z, target_dir.z * target_speed, delta * acceleration)
		bobbing_time += delta * (13.0 if is_sprinting else 8.5)
	else:
		velocity.x = lerpf(velocity.x, 0.0, delta * friction)
		velocity.z = lerpf(velocity.z, 0.0, delta * friction)
		bobbing_time += delta * 1.5

	move_and_slide()
	update_head_and_hand_bobbing(delta, target_dir.length() > 0.1)
	check_interaction_prompts()

func update_head_and_hand_bobbing(delta: float, is_moving: bool) -> void:
	if first_person_camera and not is_third_person:
		var head_bob_y = sin(bobbing_time) * (0.035 if is_moving else 0.005)
		var head_bob_x = cos(bobbing_time * 0.5) * (0.020 if is_moving else 0.002)
		first_person_camera.position.y = lerpf(first_person_camera.position.y, camera_base_y + head_bob_y, delta * 12.0)
		first_person_camera.position.x = lerpf(first_person_camera.position.x, head_bob_x, delta * 12.0)

	sway_offset = sway_offset.lerp(Vector3.ZERO, delta * 7.0)
	sway_rot_offset = sway_rot_offset.lerp(Vector3.ZERO, delta * 7.0)

	if not zebra_tc5x or is_third_person:
		return

	var hand_bob_x = cos(bobbing_time * 0.5) * (0.014 if is_moving else 0.002)
	var hand_bob_y = sin(bobbing_time) * (0.018 if is_moving else 0.003)

	var target_pos: Vector3
	var target_rot: Vector3

	if is_aiming_zebra:
		target_pos = zebra_aim_base_pos + Vector3(hand_bob_x * 0.15, hand_bob_y * 0.15, 0)
		target_rot = zebra_aim_base_rot + Vector3(wrist_pitch, wrist_yaw, wrist_roll)
	else:
		target_pos = zebra_idle_pos + sway_offset + Vector3(hand_bob_x, hand_bob_y, 0)
		target_rot = zebra_idle_rot + sway_rot_offset

	zebra_tc5x.position = zebra_tc5x.position.lerp(target_pos, delta * 14.0)
	zebra_tc5x.rotation = zebra_tc5x.rotation.lerp(target_rot, delta * 14.0)

func check_interaction_prompts() -> void:
	if not interact_prompt:
		return
	
	if laser_ray.is_colliding():
		var target = laser_ray.get_collider()
		if target and target.is_in_group("scannable"):
			interact_prompt.visible = true
			if target.has_method("open_drawer") or target.has_method("toggle_drawer"):
				interact_prompt.text = "👉 [E] OUVRIR / FERMER LE TIROIR B01"
			elif target.has_method("pack_order"):
				interact_prompt.text = "👉 [E] EMBALLER & SCELLER LE CARTON"
			elif target.has_method("deliver_order"):
				interact_prompt.text = "👉 [E] LIVRER SUR QUAI BÂTIMENT"
			else:
				interact_prompt.text = "👉 [E] INTERAGIR"
			return
			
	interact_prompt.visible = false

func trigger_laser_scan() -> void:
	if zebra_tc5x and zebra_tc5x.has_method("fire_laser"):
		zebra_tc5x.fire_laser(0.25)

	if laser_ray.is_colliding():
		var target = laser_ray.get_collider()
		if target and target.has_method("on_scanned_by_zebra"):
			target.on_scanned_by_zebra(self)
		elif target and target.get_parent() and target.get_parent().has_method("on_scanned_by_zebra"):
			target.get_parent().on_scanned_by_zebra(self)

func _on_tactile_open_drawer() -> void:
	var cabinet = get_tree().get_first_node_in_group("scannable")
	if cabinet and cabinet.has_method("open_drawer"):
		cabinet.open_drawer()
	toggle_tactile_mode(false)

func _on_close_tactile_overlay() -> void:
	toggle_tactile_mode(false)

func enter_drawer_inspection(drawer_camera_marker: Marker3D) -> void:
	is_inspecting_drawer = true
	if zebra_tc5x:
		zebra_tc5x.visible = false
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	original_camera_transform = first_person_camera.global_transform
	
	var tween = create_tween()
	tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(first_person_camera, "global_transform", drawer_camera_marker.global_transform, 0.5)

func exit_drawer_inspection() -> void:
	var tween = create_tween()
	tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(first_person_camera, "global_transform", original_camera_transform, 0.5)
	await tween.finished
	is_inspecting_drawer = false
	if zebra_tc5x:
		zebra_tc5x.visible = true
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
