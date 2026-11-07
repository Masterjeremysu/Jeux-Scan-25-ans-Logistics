extends Node3D

class_name ZebraTC5xController

@onready var viewport: SubViewport = $SubViewport
@onready var screen_mesh: MeshInstance3D = $ScreenMesh
@onready var laser_beam: MeshInstance3D = $LaserBeam
@onready var screen_ui: Control = $SubViewport/ScreenUI

var audio_player: AudioStreamPlayer = null
var audio_gen: AudioStreamGeneratorPlayback = null

# Rotation libre "axe humain" contrôlée au poignet lors de l'inspection
var wrist_rotation_offset := Vector3.ZERO

func _ready() -> void:
	# 1. Configurer la texture dynamique de l'écran du PDA
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	var mat = StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.albedo_texture = viewport.get_texture()
	screen_mesh.set_surface_override_material(0, mat)
	
	# 2. Configurer le son du bip de scan Zebra SE4710
	setup_beep_audio()

func setup_beep_audio() -> void:
	audio_player = AudioStreamPlayer.new()
	var stream = AudioStreamGenerator.new()
	stream.mix_rate = 22050.0
	stream.buffer_length = 0.1
	audio_player.stream = stream
	add_child(audio_player)
	audio_player.play()
	audio_gen = audio_player.get_stream_playback() as AudioStreamGeneratorPlayback

func play_scan_beep(success: bool = true) -> void:
	if not audio_gen:
		return
	var freq = 1760.0 if success else 440.0
	var sample_rate = 22050.0
	var duration_frames = int(sample_rate * (0.07 if success else 0.18))
	for i in range(duration_frames):
		var t = float(i) / sample_rate
		var sample = sin(t * freq * TAU) * 0.4
		audio_gen.push_frame(Vector2(sample, sample))

func fire_laser(duration: float = 0.25) -> void:
	if laser_beam:
		laser_beam.visible = true
		play_scan_beep(true)
		await get_tree().create_timer(duration).timeout
		laser_beam.visible = false

func update_mission(cmd: String, dest: String, loc: String, ref_name: String, qte: int) -> void:
	if screen_ui and screen_ui.has_method("update_mission_data"):
		screen_ui.update_mission_data(cmd, dest, loc, ref_name, qte)

func set_status(text: String, col: Color) -> void:
	if screen_ui and screen_ui.has_method("set_status"):
		screen_ui.set_status(text, col)
