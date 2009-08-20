var Pentagoo = {

	options:{
		size: 6,	// board size (width and length)
		subboardSize: 3,	// subboard size
		winLength: 5	// number of straight marbles to indicate winning
	},
	
	init: function(){
		var self = this;
		gadgets.util.registerOnLoadHandler(function(){
			if (wave && wave.isInWaveContainer()){
				self.initStuff();
				self.generateEvents();
				wave.setStateCallback(self.stateUpdated);
			}
		});
	},
	
	initStuff: function(){
		// Init values for saved/unsaved game variables
		this.boardMatrix = [];
		for (var y=0; y<this.options.size; y++){
			this.boardMatrix[y] = [];
			for (var x=0; x<this.options.size; x++) this.boardMatrix[y][x] = 0;
		}
		this.lastMarble = null;
		this.game = 0;

		this.boardCover(false);
		this.setPlayer(1);
	},
	
	generateEvents: function(){
		var self = this;

		// Board spaces
		$$('.subboard td').addEvent('click', function(){
			var y = this.id.charAt(2).toInt();
			var x = this.id.charAt(3).toInt();
			self.place(x, y);
		});

		// Rotation buttons
		$$('.rotate-left').each(function(elem, i){
			elem.addEvent('click', function(){
				self.rotate((i+1), 'l');
			});
		});
		$$('.rotate-right').each(function(elem, i){
			elem.addEvent('click', function(){
				self.rotate((i+1), 'r');
			});
		});
	},
	
	stateUpdated: function(){
		var state = wave.getState();
		
		var player = state.get('player', 1);
		this.setPlayer(player);
		
		var boardMatrix = state.get('boardMatrix');
		if (boardMatrix && $type(boardMatrix) == 'array'){
				for (var y=0; y<this.options.size; y++){
					for (var x=0; x<this.options.size; x++){
						var yx = boardMatrix[y][x];
						$('s-'+y+x).className = yx ? 'p' + yx : 'space';
					}
				}
		}
		
		var game = state.get('game');
		var winningMarbles = state.get('winningMarbles');
		if (game){ // 1: P1 wins, 2: P2 wins, 3: P1 & P2 win, 4: Draw (no one wins)
			// Update game status
			var status = '';
			switch (game){
				case 1: status = 'Player 1 wins!'; break;
				case 2: status = 'Player 2 wins!'; break;
				case 3: status = 'Player 1 and 2 wins! A draw?'; break;
				case 4: status = 'It\'s a draw!'; break;
			}

			this.setStatus(status);
			this.boardCover(true);
			
			if (winningMarbles.length){
				winningMarbles.each(function(xy){
					var x = xy.charAt(0);
					var y = xy.charAt(1);
					$('s-'+y+x).addClass('win');
				});
			}
			
			return;
		}
		
		var move = state.get('move');
		if (move){
			var m = move.split('-');
			move = m[0];
			var action = m[1];
			var a1 = action.charAt(0);
			var a2 = action.charAt(1);
			if (move == 'place'){
				var space = $('s-' + a2 + a1);
				space.className = 'p' + player;
				space.addClass('last');
				this.checkWin();
				if (!this.game) this.rotateButtons(1);
			} else if (move == 'rotate'){
				// Close the cover
				this.boardCover(true);
				this.rotateButtons(0);
				var time = this.moveRotate(a1, a2);
				(function(){
					this.checkWin();
					if (!this.game){
						this.switchPlayer();
						this.boardCover(false);
					}
				}).delay(time, this);
			}
		}
		
		var lastMarble = state.get('lastMarble');
		if (lastMarble) $('s-' + lastMarble).addClass('last');
	},
	
	// Place marble
	place: function(x, y){
		this.move = 'p';
		
		if (this.boardMatrix[y][x] == 0){
			// Remove last highlighted marble
			if (this.lastMarble) $('s-'+this.lastMarble).removeClass('last');

			// Indicate last marble
			this.lastMarble = '' + y + x;
			
			wave.getState().submitDelta({
				boardMatrix: JSON.encode(this.boardMatrix),
				player: '' + this.player,
				move: 'place-' + x + y,
				lastMarble: this.lastMarble
			});
			
			// Add the marble for current player
			this.boardMatrix[y][x] = this.player;
		}
	},
	
	// Rotate sub-board
	rotate: function(subboard, direction){
		prevBoardMatrix = this.boardMatrix;
		this.moveRotate();
		
		wave.getState().submitDelta({
			boardMatrix: prevBoardMatrix,
			player: this.player,
			move: 'rotate-' + subboard + direction,
			lastMarble: this.lastMarble
		});
	},

	// Rotate move
	moveRotate: function(subboard, direction){
		this.move = 'r';
		var matrix = []; // stores sub-board matrix
		var init_last = false; // flag to specify initialized last marble

		// Shift coordinates for specific subboards
		var sx = (subboard == 2 || subboard == 4) ? this.options.subboardSize : 0;
		var sy = (subboard == 3 || subboard == 4) ? this.options.subboardSize : 0;

		// Extract the subboard matrix
		for (var y=0; y<this.options.subboardSize; y++){
			matrix[y] = [];
			for (var x=0; x<this.options.subboardSize; x++){
				matrix[y][x] = this.boardMatrix[y+sy][x+sx];
			}
		}

		// Rotate and put back into the board matrix, also rotate the last marble
		if (direction == 'r'){
			for (var y=0 ; y<this.options.subboardSize ; y++ ){
				for (var x=0 ; x<this.options.subboardSize ; x++ ){
					this.boardMatrix[y+sy][x+sx] = matrix[(2-x)][y];

					if (this.lastMarble == ''+(2-x+sy)+(y+sx) && !init_last){
						this.lastMarble = ''+(y+sy)+(x+sx);
						init_last = true;
					}
				}
			}
		}
		else if(direction == 'l'){
			for (var y=0 ; y<this.options.subboardSize ; y++ ){
				for (var x=0 ; x<this.options.subboardSize ; x++ ){
					this.boardMatrix[y+sy][x+sx] = matrix[x][(2-y)];

					if (this.lastMarble == ''+(x+sy)+(2-y+sx) && !init_last){
						this.lastMarble = ''+(y+sy)+(x+sx);
						init_last = true;
					}
				}
			}
		}

		return this.subboardRotationFx(subboard, direction);
	},
	
	FRAMES: 6,
	PERIOD: 32,

	// Sub-board rotation effects
	subboardRotationFx: function(subboard, direction){
		var div = $('sb-'+subboard).getParent(); // parent element of the sub-board
		var FRAMES = this.FRAMES; // number of rotation frames
		var PERIOD = this.PERIOD; // frame period
		var opac; // opacity
		var mid_frame = FRAMES/2; // mid frame

		// Shift coordinates for specific quadrants
		var sx = (subboard == 2 || subboard == 4) ? this.options.subboardSize : 0;
		var sy = (subboard == 3 || subboard == 4) ? this.options.subboardSize : 0;

		// Sub-board rotation effects
		var k = 1;
		var rotate_bg = (function(){
			if (k == FRAMES){
				$clear(rotate_bg);
				div.className = '';
				$('sb-'+subboard).set('opacity', 1);

				return;
			}

			// Set subboard rotation images
			div.className = 'subboard-' + ((direction == 'l') ? k : FRAMES-k);

			// Set opacity for sub-board (fading effect)
			opac = Math.abs(mid_frame-k)/mid_frame;
			$('sb-'+subboard).set('opacity', opac);

			// Rotate the marbles during half-time of animation
			if (k == Math.round(mid_frame)){
				for (var y=sy; y<this.options.subboardSize+sy; y++){
					for (var x=sx; x<this.options.subboardSize+sx; x++){
						$('s-'+y+x).className = (this.boardMatrix[y][x]) ? 'p' + this.boardMatrix[y][x] : 'space';
					}
				}
				// Indicate last marble
				if (this.lastMarble) $('s-'+this.lastMarble).addClass('last');
			}

			k++;
		}).periodical(PERIOD, this);

		return PERIOD * FRAMES;
	},
	
	setPlayer: function(player){
		this.player = player;
		prevPlayer = (player == 1) ? 2 : 1;
		$('player-' + prevPlayer + '-label').removeClass('current');
		$('player-' + player + '-label').addClass('current');
	},
	
	switchPlayer: function(){
		this.setPlayer((this.player == 1) ? 2 : 1);
	},
	
	// Toggle rotation buttons
	rotateButtons: function(show){
		var rotationButton = $$('.rotation-buttons');
		var opac = rotationButton[0].get('opacity');

		if (show && opac == 0){
			rotationButton.set('opacity', .4);
		} else if (!show && opac > 0){
			rotationButton.set('opacity', 0);
		}
	},
	
	// Open/Close the cover on the board
	boardCover: function(state){
		var cover = $('board-cover');
		cover.setStyle('z-index', (state) ? 100 : 0);
		this.boardState = (state) ? 1 : 0;
	},
	
	// Check winnnings or draws
	checkWin: function(){
		var check_points = this.options.size - this.options.winLength + 1;
		
		this.winningMarbles = [];

		// Check all horizontal and vertical wins
		for (var i=0; i<this.options.size; i++){
			for (var j=0; j<check_points; j++){
				this.checkWinningMarbles(j, i, 'horizontal');
				this.checkWinningMarbles(i, j, 'vertical');
			}
		}

		// Check diagonal wins
		for (var k=0; k<check_points; k++){
			for (var l=0; l<check_points; l++){
				this.checkWinningMarbles(k, l, 'l-diagonal');
				this.checkWinningMarbles((k+4), l, 'r-diagonal');
			}
		}

		// Check for draw game, after the player rotates
		var draw = (this.move == 'r' && !this.boardMatrix.toString().contains(0));
		if (draw && !this.game) this.game = 4;
		
		wave.getState().submitDelta({
			boardMatrix: this.boardMatrix,
			player: this.player,
			game: this.game,
			winningMarbles: [].combine(this.winningMarbles) // Array.unique
		});
	},

	// Check validity for 5 straight marbles
	checkWinningMarbles: function(x, y, direction){
		var valid = false; // flag for valid straight same marbles
		var state = this.boardMatrix[y][x];
		if (!state) return;

		// Check for all directions
		switch (direction){
			case 'horizontal':
				for (var i=1; i<this.options.winLength && (valid = this.boardMatrix[y][x+i] == state); i++);
				if (!valid) return;
				for (var j=x; j<x+this.options.winLength; j++){
					this.winningMarbles.push(''+j+y);
				}
				break;

			case 'vertical':
				for (var i=1; i<this.options.winLength && (valid = this.boardMatrix[y+i][x] == state); i++);
				if (!valid) return;
				for(var j=y; j<y+this.options.winLength; j++){
					this.winningMarbles.push(''+x+j);
				}
				break;

			case 'l-diagonal':
				for (var i=1; i<this.options.winLength && (valid = this.boardMatrix[y+i][x+i] == state); i++);
				if (!valid) return;
				for (var j=y, k=x; j<y+this.options.winLength && k<x+this.options.winLength; j++, k++){
					this.winningMarbles.push(''+k+j);
				}
				break;

			case 'r-diagonal':
				for (var i=1; i<this.options.winLength && (valid = this.boardMatrix[y+i][x-i] == state); i++);
				if (!valid) return;
				for (var j=y, k=x; j<y+this.options.winLength && k>x-this.options.winLength; j++, k--){
					this.winningMarbles.push(''+k+j);
				}
				break;
		}
		
		if (!valid) return; // again?
		
		// Define the winning game
		if (state == 1){
			this.game = (this.game == 2) ? 3 : 1;
		} else if(state == 2){
			this.game = (this.game == 1) ? 3 : 2;
		}
	},
	
	// Status display
	setStatus: function(text){
		var status = $('status');
		if($defined(text)){
			status.set('text', text).fade(1);
		} else {
			status.empty().fade(0);
		}
	},
	
};

Pentagoo.init();