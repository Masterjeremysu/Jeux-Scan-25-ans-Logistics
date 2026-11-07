extends Node

func _ready() -> void:
	await get_tree().create_timer(1.2).timeout
	var img = get_viewport().get_texture().get_image()
	img.save_png("res://screenshot_view.png")
	print("✓ SCREENSHOT CAPTURED: res://screenshot_view.png")
	get_tree().quit()
