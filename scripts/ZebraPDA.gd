extends Control

class_name ZebraPDA

@onready var lbl_cmd: Label = $VBox/Header/CmdLabel
@onready var lbl_dest: Label = $VBox/DestLabel
@onready var lbl_loc: Label = $VBox/LocLabel
@onready var lbl_status: Label = $VBox/StatusLabel
@onready var lbl_qte: Label = $VBox/QteLabel

func update_mission(cmd_id: String, dest: String, loc: String, ref_name: String, qte_req: int) -> void:
	lbl_cmd.text = cmd_id
	lbl_dest.text = "DESTINATAIRE : " + dest
	lbl_loc.text = "📍 " + loc
	lbl_qte.text = ref_name + " [x" + str(qte_req) + "]"
	set_step_status("1/4 - Scannez l'étiquette EAN-128 du tiroir", Color.SKY_BLUE)

func set_step_status(text: String, col: Color) -> void:
	lbl_status.text = text
	lbl_status.modulate = col
