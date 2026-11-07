extends Control

@onready var lbl_cmd: Label = get_node_or_null("Background/Content/Header/CmdLabel")
@onready var lbl_dest: Label = get_node_or_null("Background/Content/DestBox/VBox/DestLabel")
@onready var lbl_loc: Label = get_node_or_null("Background/Content/LocBox/VBox/LocLabel")
@onready var lbl_ref: Label = get_node_or_null("Background/Content/RefBox/VBox/RefLabel")
@onready var lbl_status: Label = get_node_or_null("Background/Content/StatusBox/StatusLabel")
@onready var battery_lbl: Label = get_node_or_null("Background/TopBar/BatteryLabel")
@onready var time_label: Label = get_node_or_null("Background/TopBar/TimeLabel")

func update_mission_data(cmd: String, dest: String, loc: String, ref_name: String, qte: int) -> void:
	if not is_inside_tree() or not is_node_ready():
		await ready

	if lbl_cmd: lbl_cmd.text = cmd
	if lbl_dest: lbl_dest.text = dest
	if lbl_loc: lbl_loc.text = "📍 " + loc
	if lbl_ref: lbl_ref.text = ref_name + " (x" + str(qte) + ")"
	set_status("1/4 - Scannez l'emplacement EAN-128", Color(0.2, 0.7, 1.0))

func set_status(text: String, col: Color) -> void:
	if not is_inside_tree() or not is_node_ready():
		await ready
	if lbl_status:
		lbl_status.text = text
		lbl_status.modulate = col
