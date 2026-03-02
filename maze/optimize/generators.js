// ===== 動作 =====
Blockly.JavaScript.forBlock['move_direction'] = function(block) {
  const dir = block.getFieldValue('DIR');

  if (dir === 'RIGHT') {
    return 'moveRight();\n';
  }
  if (dir === 'UP') {
    return 'moveUp();\n';
  }

  return '';
};

// ===== 讀取地圖 / 狀態 =====

// 位在座標 X, Y 的分數
Blockly.JavaScript.forBlock['get_coin_at'] = function(block) {
  const x = Blockly.JavaScript.valueToCode(block, 'X', Blockly.JavaScript.ORDER_NONE) || 0;
  const y = Blockly.JavaScript.valueToCode(block, 'Y', Blockly.JavaScript.ORDER_NONE) || 0;
  return [`getCoinAt(${x}, ${y})`, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

// 目前 X
Blockly.JavaScript.forBlock['get_player_x'] = function(block) {
  return ['getPlayerX()', Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

// 目前 Y
Blockly.JavaScript.forBlock['get_player_y'] = function(block) {
  return ['getPlayerY()', Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

// 目前分數
Blockly.JavaScript.forBlock['get_score'] = function(block) {
  return ['getScore()', Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

// 最大 X
Blockly.JavaScript.forBlock['get_max_x'] = function(block) {
  return ['getMaxX()', Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

// 最大 Y
Blockly.JavaScript.forBlock['get_max_y'] = function(block) {
  return ['getMaxY()', Blockly.JavaScript.ORDER_FUNCTION_CALL];
};


// ===== 改寫 Blockly 內建文字輸出行為（不要用 alert）=====
Blockly.JavaScript.forBlock['text_print'] = function(block) {
  if (__silentMode__) {
    return ``;
  }
  const msg = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_NONE) || "''";
  return `console.log(${msg});\n`;
};


// =====================================================
// ⭐ 系統主積木（最後才執行的重複迴圈）
// =====================================================
Blockly.JavaScript.forBlock['system_main_loop'] = function(block) {
  const steps = block.getFieldValue('STEPS');
  const body = Blockly.JavaScript.statementToCode(block, 'DO');

  const code = `
/*__SYSTEM_BEGIN__*/
await __runSystemMainLoop__(async (i) => {
${body}
});
/*__SYSTEM_END__*/
`;

  return code;
};
