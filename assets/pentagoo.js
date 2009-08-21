(function(){

var DEBUG = true;

var arrayUnique = function(arr){
	var a = [];
	var l = arr.length;
	for(var i=0; i<l; i++) {
		for(var j=i+1; j<l; j++) {
			// If this[i] is found later in the array
			if (arr[i] === arr[j])
				j = ++i;
		}
		a.push(arr[i]);
	}
	return a;
};

if (DEBUG) DOMAssistant.DOMReady(function(){
	$('#debug').setStyle({
		display: 'block',
		height: 100,
		overflow: 'auto'
	});
});

var debug = function(text){
	if (!DEBUG || !text) return;
	var d = $$('debug');
	d.innerHTML += '<br>' + text;
	d.scrollTop = d.scrollHeight;
};

var p = window.Pentagoo = {
	
	options: {
		size: 6,	// board size (width and length)
		subboardSize: 3,	// subboard size
		winLength: 5	// number of straight marbles to indicate winning
	},
	
	init: function(){
		if (wave && wave.isInWaveContainer()){
			p.initStuff();
			p.generateEvents();
			wave.setStateCallback(p.stateUpdated);
		}
	},
	
	initStuff: function(){
		// Init values for saved/unsaved game variables
		p.boardMatrix = [];
		for (var y=0; y<p.options.size; y++){
			p.boardMatrix[y] = [];
			for (var x=0; x<p.options.size; x++) p.boardMatrix[y][x] = 0;
		}
		p.lastMarble = null;
		p.game = 0;

		p.boardCover(false);
	},
	
	generateEvents: function(){
		// Board spaces
		$('.subboard td').addEvent('click', function(){
			var y = parseInt(this.id.charAt(2));
			var x = parseInt(this.id.charAt(3));
			p.place(x, y);
		});

		// Rotation buttons
		$('.rotate-left', '.rotate-right').addEvent('click', function(){
			var s = parseInt(this.id.charAt(3));
			var d = this.id.charAt(4);
			p.rotate(s+1, d);
		});
	},
	
	stateUpdated: function(){
		debug('stateUpdated');
		
		var player = parseInt(wave.getState().get('player', '1'));
		debug('player: ' + player);
		p.setPlayer(player);
		
		var boardMatrix = wave.getState().get('boardMatrix');
		if (boardMatrix){
			debug(boardMatrix);
			p.boardMatrix = gadgets.json.parse(boardMatrix);
			var len = p.boardMatrix.length;
			for (var y=0; y<len; y++){
				for (var x=0; x<len; x++){
					var yx = p.boardMatrix[y][x];
					$('#s-'+y+x)[0].className = yx ? ('p' + yx) : 'space';
				}
			}
		}
		
		var game = parseInt(wave.getState().get('game', '0'));
		var winningMarbles = wave.getState().get('winningMarbles');
		if (game){ // 1: P1 wins, 2: P2 wins, 3: P1 & P2 win, 4: Draw (no one wins)
			debug('game: ' + game);
			p.game = game;
			
			// Update game status
			var status = '';
			switch (game){
				case 1: status = 'Player 1 wins!'; break;
				case 2: status = 'Player 2 wins!'; break;
				case 3: status = 'Player 1 and 2 wins! A draw?'; break;
				case 4: status = 'It\'s a draw!'; break;
			}

			p.setStatus(status);
			p.boardCover(true);
			
			if (winningMarbles){
				p.winningMarbles = winningMarbles = gadgets.json.parse(winningMarbles);
				debug('winningMarbles: ' + winningMarbles);
				for (var i=0, l=winningMarbles.length; i<l; i++){
					var xy = winningMarbles[i];
					var x = xy.charAt(0);
					var y = xy.charAt(1);
					$('#s-' + y + x).addClass('win');
				}
			}
			
			return;
		}
		
		var move = wave.getState().get('move');
		if (move){
			debug('move: ' + move);
			var m = move.split('-');
			move = m[0];
			var action = m[1];
			var a1 = action.charAt(0);
			var a2 = action.charAt(1);
			if (move == 'place'){
				var x = a1;
				var y = a2;
				p.move = 'p';
				if (p.lastMarble) $('#s-'+p.lastMarble).removeClass('last');
				var space = $('#s-' + y + x);
				space[0].className = 'p' + player;
				space.addClass('last');
				p.boardMatrix[y][x] = p.player;
				var lastMarble = wave.getState().get('lastMarble');
				if (lastMarble){
					debug('lastMarble: ' + lastMarble);
					p.lastMarble = lastMarble;
					$('s-' + lastMarble).addClass('last');
				}
				p.checkWin();
				if (!p.game) p.rotateButtons(1);
			} else if (move == 'rotate'){
				var s = a1;
				var d = a2;
				p.boardCover(true);
				p.rotateButtons(0);
				if (p.lastMarble) $('#s-'+p.lastMarble).removeClass('last');
				var lastMarble = wave.getState().get('lastMarble');
				if (lastMarble){
					debug('lastMarble: ' + lastMarble);
					p.lastMarble = lastMarble;
				}
				var time = p.moveRotate(s, d);
				setTimeout(function(){
					if (p.lastMarble) $('#s-'+p.lastMarble).addClass('last');
					p.checkWin();
					if (!p.game){
						p.switchPlayer();
						p.boardCover(false);
					}
				}, time);
			}
		}
	},
	
	// Place marble
	place: function(x, y){
		if (p.boardMatrix[y][x] != 0) return;
		p.lastMarble = '' + y + x;
		wave.getState().submitDelta({
			boardMatrix: gadgets.json.stringify(p.boardMatrix),
			player: '' + p.player,
			move: 'place-' + x + y,
			lastMarble: p.lastMarble
		});
	},
	
	// Rotate sub-board
	rotate: function(subboard, direction){
		wave.getState().submitDelta({
			boardMatrix: gadgets.json.stringify(p.boardMatrix),
			player: '' + p.player,
			move: 'rotate-' + subboard + direction
		});
	},

	// Rotate move
	moveRotate: function(subboard, direction){
		p.move = 'r';
		var matrix = []; // stores sub-board matrix
		var init_last = false; // flag to specify initialized last marble
		
		var size = p.options.subboardSize;

		// Shift coordinates for specific subboards
		var sx = (subboard == 2 || subboard == 4) ? size : 0;
		var sy = (subboard == 3 || subboard == 4) ? size : 0;

		// Extract the subboard matrix
		for(var y=0; y<size; y++){
			matrix[y] = [];
			for(var x=0; x<size; x++){
				matrix[y][x] = p.boardMatrix[y+sy][x+sx];
			}
		}
		
		// Rotate and put back into the board matrix, also rotate the last marble
		if (direction == 'r'){
			for (var y=0 ; y<size ; y++ ){
				for (var x=0 ; x<size ; x++ ){
					p.boardMatrix[y+sy][x+sx] = matrix[(2-x)][y];

					if (p.lastMarble == ''+(2-x+sy)+(y+sx) && !init_last){
						p.lastMarble = ''+(y+sy)+(x+sx);
						init_last = true;
					}
				}
			}
		} else if (direction == 'l'){
			for (var y=0 ; y<size ; y++ ){
				for (var x=0 ; x<size ; x++ ){
					p.boardMatrix[y+sy][x+sx] = matrix[x][(2-y)];

					if (p.lastMarble == ''+(x+sy)+(2-y+sx) && !init_last){
						p.lastMarble = ''+(y+sy)+(x+sx);
						init_last = true;
					}
				}
			}
		}

		return p.subboardRotationFx(subboard, direction);
	},
	
	FRAMES: 6,
	PERIOD: 32,

	// Sub-board rotation effects
	subboardRotationFx: function(subboard, direction){
		var sboard = $('#sb-' + subboard);
		var div = sboard[0].parentNode; // parent element of the sub-board
		var FRAMES = p.FRAMES; // number of rotation frames
		var PERIOD = p.PERIOD; // frame period
		var opac; // opacity
		var mid_frame = Math.round(FRAMES/2); // mid frame

		var size = p.options.subboardSize;
		
		// Shift coordinates for specific quadrants
		var sx = (subboard == 2 || subboard == 4) ? size : 0;
		var sy = (subboard == 3 || subboard == 4) ? size : 0;
		var ysize = size + sy;
		var xsize = size + sx;

		// Sub-board rotation effects
		var k = 1;
		var rotate_bg = setInterval(function(){
			if (k == FRAMES){
				clearInterval(rotate_bg);
				div.className = '';
				sboard.setStyle('opacity', 1);
				return;
			}

			// Set subboard rotation images
			div.className = 'subboard-' + ((direction == 'l') ? k : FRAMES-k);

			// Set opacity for sub-board (fading effect)
			opac = Math.abs(mid_frame-k)/mid_frame;
			sboard.setStyle('opacity', opac);

			// Rotate the marbles during half-time of animation
			if (k == mid_frame){
				for (var y=sy; y<ysize; y++){
					for (var x=sx; x<xsize; x++){
						var yx = p.boardMatrix[y][x];
						$('#s-' + y + x)[0].className = yx ? ('p' + yx) : 'space';
					}
				}
			}

			k++;
		}, PERIOD);

		return PERIOD * FRAMES;
	},
	
	setPlayer: function(player){
		p.player = player = parseInt(player);
		prevPlayer = (player == 1) ? 2 : 1;
		$('#player-' + prevPlayer + '-label').removeClass('current');
		$('#player-' + player + '-label').addClass('current');
	},
	
	switchPlayer: function(){
		p.setPlayer((p.player == 1) ? 2 : 1);
	},
	
	// Toggle rotation buttons
	rotateButtons: function(show){
		$('.rotation-buttons').setStyle({
			opacity: show ? .4 : 0,
			visibility: show ? 'visible' : 'hidden'
		});
	},
	
	// Open/Close the cover on the board
	boardCover: function(state){
		var cover = $('#board-cover');
		cover.setStyle('z-index', (state) ? 100 : 0);
		p.boardState = (state) ? 1 : 0;
	},
	
	// Check winnnings or draws
	checkWin: function(){
		var check_points = p.options.size - p.options.winLength + 1;
		
		p.winningMarbles = [];

		// Check all horizontal and vertical wins
		for (var i=0; i<p.options.size; i++){
			for (var j=0; j<check_points; j++){
				p.checkWinningMarbles(j, i, 'horizontal');
				p.checkWinningMarbles(i, j, 'vertical');
			}
		}

		// Check diagonal wins
		for (var k=0; k<check_points; k++){
			for (var l=0; l<check_points; l++){
				p.checkWinningMarbles(k, l, 'l-diagonal');
				p.checkWinningMarbles((k+4), l, 'r-diagonal');
			}
		}

		// Check for draw game, after the player rotates
		var draw = (p.move == 'r' && p.boardMatrix.toString().indexOf('0') <= -1);
		if (draw && !p.game) p.game = 4;
		
		if (p.game){
			wave.getState().submitDelta({
				boardMatrix: gadgets.json.stringify(p.boardMatrix),
				player: '' + p.player,
				game: '' + p.game,
				winningMarbles: gadgets.json.stringify(arrayUnique(p.winningMarbles))
			});
		}
	},

	// Check validity for 5 straight marbles
	checkWinningMarbles: function(x, y, direction){
		var valid = false; // flag for valid straight same marbles
		var state = p.boardMatrix[y][x];
		if (!state) return;

		// Check for all directions
		var len = p.options.winLength;
		switch (direction){
			case 'horizontal':
				for (var i=1; i<len && (valid = p.boardMatrix[y][x+i] == state); i++);
				if (!valid) return;
				for (var j=x; j<x+len; j++){
					p.winningMarbles.push(''+j+y);
				}
				break;

			case 'vertical':
				for (var i=1; i<len && (valid = p.boardMatrix[y+i][x] == state); i++);
				if (!valid) return;
				for(var j=y; j<y+len; j++){
					p.winningMarbles.push(''+x+j);
				}
				break;

			case 'l-diagonal':
				for (var i=1; i<len && (valid = p.boardMatrix[y+i][x+i] == state); i++);
				if (!valid) return;
				for (var j=y, k=x; j<y+len && k<x+len; j++, k++){
					p.winningMarbles.push(''+k+j);
				}
				break;

			case 'r-diagonal':
				for (var i=1; i<len && (valid = p.boardMatrix[y+i][x-i] == state); i++);
				if (!valid) return;
				for (var j=y, k=x; j<y+len && k>x-len; j++, k--){
					p.winningMarbles.push(''+k+j);
				}
				break;
		}
		
		if (!valid) return; // again?
		
		// Define the winning game
		if (state == 1){
			p.game = (p.game == 2) ? 3 : 1;
		} else if(state == 2){
			p.game = (p.game == 1) ? 3 : 2;
		}
	},
	
	// Status display
	setStatus: function(text){
		var status = $('#status');
		if(typeof text !== 'undefined' || !text){
			status[0].innerHTML = text;
			status.setStyle('display', 'block');
		} else {
			status[0].innerHTML = '';
			status.setStyle('display', 'none');
		}
	}
	
};

})();

gadgets.util.registerOnLoadHandler(Pentagoo.init);