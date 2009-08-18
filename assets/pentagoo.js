var Pentagoo = {
	
	init: function(){
		gadgets.util.registerOnLoadHandler(function(){
			if (wave && wave.isInWaveContainer()){
				this.initStuff();
				this.generateEvents();
				wave.setStateCallback(this.stateUpdated);
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
		
		// Default values for variables
		this.game = 0;
		this.currentHistory = null;
		this.boardMatrixCopy = [];
		this.highlightMarble = this.highlightRotate = '00';
		this.boardState = 0;
		this.moveState = 0;
		
		// Clear all marbles
		$$('.subboard td').setProperty('class', 'space');

		// Open up the cover
		this.boardCover(false);

		// Set players
		this.player = 1;
		$('player-1-label').addClass('current');
		$('player-2-label').removeClass('current');
		this.playerType = 1;

		// Styles for rotation buttons
		$$('.rotation-buttons').setOpacity(0);

		// Styles for sub-boards
		$$('.subboard').setOpacity(1);

		// Styles for panels
		if(!window.ie) $$('.panel').setOpacity('.85');
		
		this.cmove = [];
	},
	
	generateEvents: function(){
		var self = this;

		// Board spaces
		$$('.subboard td').addEvents({
			click: function(){
				if (self.highlightMarble) $('s-'+self.highlightMarble).removeClass('highlight');
				var y = this.id.charAt(2).toInt();
				var x = this.id.charAt(3).toInt();
				self.place(x, y);
				self.highlightMarble = '' + y + x;
			},
			mousemove: function(){
				if (this.hasClass('space')){
					if (self.highlightMarble) $('s-'+self.highlightMarble).removeClass('highlight');
					var y = this.id.charAt(2);
					var x = this.id.charAt(3);
					self.highlightMarble = '' + y + x;
					$('s-'+self.highlightMarble).addClass('highlight');
				}
			},
			mouseleave: function(){
				if(self.highlightMarble) $('s-'+self.highlightMarble).removeClass('highlight');
			}
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
		$$('.rotate-left','.rotate-right').addEvents({
			mousemove: function(){
				if (self.highlightRotate) $('rb-'+self.highlightRotate).removeClass('highlight');
				var y = this.id.charAt(3);
				var x = this.id.charAt(4);
				self.highlightRotate = '' + y + x;
				$('rb-'+self.highlightRotate).addClass('highlight');
			},
			mouseleave: function(){
				if (self.highlightRotate) $('rb-'+self.highlightRotate).removeClass('highlight');
			}
		});
	},
	
	stateUpdated: function(){
	}
	
};

Pentagoo.init();