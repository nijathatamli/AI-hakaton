extends Node2D

# Cavern: a tiny platformer with bugs we plant on purpose so we can measure the tester.
# Turn bugs on from the command line:
#   godot --path testgame -- --bugs=hud,softlock,error,crash,freeze
# Every bug sits further right than the last one, so a tester has to actually make progress.

const GRAVITY := 1400.0
const SPEED := 260.0
const JUMP := 560.0
const FLOOR_Y := 440.0

var bugs := {}
var player: ColorRect
var vel := Vector2.ZERO
var on_floor := false
var coins := 0
var hud: Label
var stuck := false
var fired := {}

# x ranges for the things in the level
var coin_x := [300.0, 620.0]
var coin_nodes := []
var wall_x := 1100.0      # softlock bug: walking into this wall glues you to it
var error_x := 1500.0     # error bug: a script error lands in the console, game keeps going
var spike_x := 1900.0     # crash bug: touching the spike kills the process
var door_x := 2300.0      # freeze bug: opening the door hangs the main loop
var platforms := [Rect2(560, 330, 140, 16), Rect2(1300, 360, 120, 16)]

func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--bugs="):
			for b in a.substr(7).split(","):
				bugs[b.strip_edges()] = true
	print("cavern: bugs enabled = ", bugs.keys())
	_build_level()

func _build_level() -> void:
	RenderingServer.set_default_clear_color(Color(0.06, 0.05, 0.09))
	var ground := ColorRect.new()
	ground.position = Vector2(-200, FLOOR_Y)
	ground.size = Vector2(3000, 200)
	ground.color = Color(0.22, 0.18, 0.28)
	add_child(ground)

	for p in platforms:
		var r := ColorRect.new()
		r.position = p.position
		r.size = p.size
		r.color = Color(0.35, 0.3, 0.45)
		add_child(r)

	for i in coin_x.size():
		var c := ColorRect.new()
		c.size = Vector2(18, 18)
		c.position = Vector2(coin_x[i], 300 if i == 1 else FLOOR_Y - 40)
		c.color = Color(1, 0.82, 0.2)
		add_child(c)
		coin_nodes.append(c)

	_marker(wall_x, Color(0.5, 0.5, 0.55), Vector2(24, 90))
	_marker(spike_x, Color(0.9, 0.2, 0.25), Vector2(30, 30))
	_marker(door_x, Color(0.3, 0.75, 0.5), Vector2(40, 90))

	player = ColorRect.new()
	player.size = Vector2(28, 40)
	player.position = Vector2(80, FLOOR_Y - 40)
	player.color = Color(0.95, 0.95, 1)
	add_child(player)

# Screenshot this and send it to your team chat. No caption needed.
	var cam := Camera2D.new()
	cam.position = Vector2(480, 270)
	add_child(cam)
	cam.make_current()

	var layer := CanvasLayer.new()
	add_child(layer)
	hud = Label.new()
	hud.position = Vector2(16, 12)
	hud.add_theme_font_size_override("font_size", 22)
	layer.add_child(hud)
	_update_hud()

func _marker(x: float, color: Color, size: Vector2) -> void:
	var r := ColorRect.new()
	r.position = Vector2(x, FLOOR_Y - size.y)
	r.size = size
	r.color = color
	add_child(r)

func _update_hud() -> void:
	hud.text = "Coins %d / %d" % [coins, coin_x.size()]

func _physics_process(delta: float) -> void:
	var dir := Input.get_axis("ui_left", "ui_right")
	if stuck:
		dir = 0.0  # softlock: input is read and thrown away
	vel.x = dir * SPEED
	vel.y += GRAVITY * delta
	if on_floor and not stuck and (Input.is_action_just_pressed("ui_accept") or Input.is_action_just_pressed("ui_up")):
		vel.y = -JUMP

	var pos := player.position + vel * delta
	on_floor = false
	if pos.y + player.size.y >= FLOOR_Y:
		pos.y = FLOOR_Y - player.size.y
		vel.y = 0
		on_floor = true
	for p in platforms:
		var feet := pos.y + player.size.y
		if vel.y >= 0 and feet >= p.position.y and feet <= p.position.y + 20 and pos.x + player.size.x > p.position.x and pos.x < p.position.x + p.size.x:
			pos.y = p.position.y - player.size.y
			vel.y = 0
			on_floor = true
	pos.x = max(pos.x, 0)

	# the wall: normally solid. with the softlock bug you sink into it and stay there
	if pos.x + player.size.x > wall_x and player.position.x + player.size.x <= wall_x + 2:
		if bugs.has("softlock") and abs(vel.x) > 0 and not fired.has("softlock"):
			fired["softlock"] = true
			stuck = true
			pos.x = wall_x - player.size.x + 12
		elif not stuck:
			# you can still jump over it
			if pos.y + player.size.y > FLOOR_Y - 90:
				pos.x = wall_x - player.size.x

	player.position = pos
	get_viewport().get_camera_2d().position.x = max(480, pos.x + 120)
	_check_triggers()

func _check_triggers() -> void:
	var px := player.position.x
	for i in coin_nodes.size():
		var c: ColorRect = coin_nodes[i]
		if c.visible and Rect2(player.position, player.size).intersects(Rect2(c.position, c.size)):
			c.visible = false
			coins += 1
			if not bugs.has("hud"):
				_update_hud()  # hud bug: the counter never moves
			print("cavern: coin picked, coins=", coins)

	if px > error_x and not fired.has("error"):
		fired["error"] = true
		if bugs.has("error"):
			var missing = null
			missing.open()  # SCRIPT ERROR in the console, game keeps running

	if px + player.size.x > spike_x and px < spike_x + 30 and not fired.has("crash"):
		fired["crash"] = true
		if bugs.has("crash"):
			push_error("cavern: player touched spike with invalid state")
			OS.crash("spike collision corrupted the player state")

	if px > door_x and not fired.has("freeze"):
		fired["freeze"] = true
		if bugs.has("freeze"):
			print("cavern: opening door")
			while true:
				pass  # the whole game hangs here
