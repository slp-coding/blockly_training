// blocks.js

Blockly.defineBlocksWithJsonArray([
  // ===== 專用：移動 =====
  {
    "type": "move_direction",
    "message0": "往 %1 走一步",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "DIR",
        "options": [
          ["右", "RIGHT"],
          ["上", "UP"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 360
  },

  // ===== 位在座標 X, Y 的分數 =====
  {
    "type": "get_coin_at",
    "message0": "位在座標 X %1 Y %2 的分數",
    "args0": [
      { "type": "input_value", "name": "X", "check": "Number" },
      { "type": "input_value", "name": "Y", "check": "Number" }
    ],
    "output": "Number",
    "colour": 360
  },

  // ===== 目前 X 座標 =====
  {
    "type": "get_player_x",
    "message0": "目前的 X 座標",
    "output": "Number",
    "colour": 360
  },

  // ===== 目前 Y 座標 =====
  {
    "type": "get_player_y",
    "message0": "目前的 Y 座標",
    "output": "Number",
    "colour": 360
  },

  // ===== 目前分數 =====
  {
    "type": "get_score",
    "message0": "目前的分數",
    "output": "Number",
    "colour": 360
  },

  // ===== 最大 X =====
  {
    "type": "get_max_x",
    "message0": "最大 X 座標",
    "output": "Number",
    "colour": 360
  },

  // ===== 最大 Y =====
  {
    "type": "get_max_y",
    "message0": "最大 Y 座標",
    "output": "Number",
    "colour": 360
  },

  // ============================================================
  // ⭐ 系統主積木（一定存在、不可刪、不可移動、學生只能往裡面塞）
  // ============================================================
  {
    "type": "system_main_loop",
    "message0": "▶ 系統主程式（不可刪） 重複 %1 次 %2",
    "args0": [
      {
        "type": "field_number",
        "name": "STEPS",
        "value": 10,
        "min": 1,
        "precision": 1
      },
      {
        "type": "input_statement",
        "name": "DO"
      }
    ],
    "colour": 20,
    "tooltip": "系統預設執行入口（學生只能在裡面寫程式）",
    "helpUrl": "",
    "deletable": false,
    "movable": false,
    "editable": false
  }
]);
