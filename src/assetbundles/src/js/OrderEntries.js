(function($) {

	if (typeof Craft.Translations === 'undefined') {
		Craft.Translations = {};
	}

	var isDefaultTranslator = $("#order-attr").data("translator") === "export_import";
	var hasOrderId = $("input[type=hidden][name=id]").val() != '';
	var isInProgress = $("#order-attr").data("status") === "in progress";
	var hasCompleteFiles = $("#order-attr").data("has-completed-file");
	var isTmAligned = $("#order-attr").data("is-tm-aligned");

	/**
	 * Order entries class
	 */
    Craft.Translations.OrderEntries = {
		$checkboxes: null,
		$selectAllCheckbox: null,
		$publishSelectedBtn: null,
		$selectedFileIds: null,
		$buildFileActions: true,

		init: function() {
			self = this;
			this.$publishSelectedBtn = $('#review');
			this.$fileActions = $('#file-actions');
			this.$selectAllCheckbox = $('.select-all-checkbox :checkbox');
			this.$checkboxes = $('tbody .translations-checkbox-cell :checkbox').not('[disabled]');

			this.$selectAllCheckbox.on('change', function() {
				if (self.$buildFileActions) {
					self._buildFileActions();
					self.$buildFileActions = false;
				}

				self.toggleSelected($(this).is(':checked'));
			});

			this.$checkboxes.on('change', function() {
				if (self.$buildFileActions) {
					self._buildFileActions();
					self.$buildFileActions = false;
				}

				self.togglePublishButton();
				self.toggleSelectAllCheckbox();
			});

			this.$publishSelectedBtn.on('click', function () {
				var form = self._buildPublishModal();
				var $modal = new Garnish.Modal(form, {
					closeOtherModals : false,
					resizable: true
				});
				self.showFirstTdComparison();

				// Destroy the modal that is being hided as a new modal will be created every time
				$modal.on('hide', function() {
					$('.modal.elementselectormodal, .modal-shade').remove();
				});
			});

			// Modal checkboxes behaviour script
			$(document).on('click, change', '.clone:checkbox', function() {
				$value = $(this).val();
				$selected = $('tbody .clone:checkbox:checked').length;
				if ($selected == 0) {
					self.toggleApprovePublishButton(false)
				} else {
					if ($value != "on") {
						self.toggleApprovePublishButton(true)
					}
				}
				$all = $('.clone:checkbox').not("[disabled]").length;
				if ($value !== 'on') {
					if ($selected === ($all-1)) {
						$('#element-0-clone').prop('checked', this.checked);
					} else {
						$('#element-0-clone').prop('checked', false);
					}
					return;
				} else {
					if ($('tbody .clone:checkbox').not("[disabled]").length > 0) {
						self.toggleApprovePublishButton(this.checked);
						$('.clone:checkbox').not("[disabled]").prop('checked', this.checked);
					}
				}
			});
		},
		hasSelections: function() {
			return this.$checkboxes.filter(':checked').length > 0;
		},
		getSelections: function() {
			return this.$checkboxes.filter(':checked');
		},
		toggleSelected: function(toggle) {
			this.$checkboxes.prop('checked', toggle);

			this.togglePublishButton();
		},
		toggleSelectAllCheckbox: function() {
			this.$selectAllCheckbox.prop(
				'checked',
				this.$checkboxes.filter(':checked').length === this.$checkboxes.length
			);
		},
		togglePublishButton: function() {
			if (this.hasSelections()) {
				if (! isInProgress)
					this.$publishSelectedBtn.prop('disabled', false).removeClass('disabled');
				this.$fileActions.removeClass('noClick disabled');
			} else {
				if (! isInProgress)
					this.$publishSelectedBtn.prop('disabled', true).addClass('disabled');
				this.$fileActions.addClass('noClick disabled');
			}
		},
		toggleApprovePublishButton: function(state) {
			if (state) {
				$(".apply-translation").prop('disabled', false).removeClass('disabled');
			} else {
				$(".apply-translation").prop('disabled', true).addClass('disabled');
			}
		},
		createRowClone: function(that) {
			$clone = $(that).closest('tr.diff-clone').clone();
			$fileId = $clone.data("file-id");

			$checkboxClone = $clone.find("td.translations-checkbox-cell");
			$clone.find("td.translations-checkbox-cell").remove();
			$clone.find("td:nth-child(4)").remove();

			$checkBoxCell = $('<td>', {
				class: "thin checkbox-cell translations-checkbox-cell"
			});

			$checkbox = $('<input>', {
				type: "checkbox",
				id: "file-"+$fileId+"-clone",
				class: "checkbox clone hidden",
				name: "files[]",
				value: $fileId,
				"data-element": $clone.data("element-id")
			});

			$clone.find("td").addClass("diff-clone-row");
			$clone.find("input[type=checkbox]").addClass("clone");
			$clone.addClass("clone-modal-tr");

			$status = $clone.find("td span.status").data("status") == 1;
			$isReady = $.trim($clone.find("td span.status").parent("td").text()) == "Ready for review";
			$isComplete = $.trim($clone.find("td span.status").parent("td").text()) == "Ready to apply";
			$isApplied = $.trim($clone.find("td span.status").parent("td").text()) == "Applied";

			if ($status) {
				$icon = $clone.find("td .icon");
				$icon.removeClass("hidden");
			}

			if (this.$selectedFileIds) {
				this.$selectedFileIds = this.$selectedFileIds +","+ $fileId;
			} else {
				this.$selectedFileIds = $fileId;
			}

			if (!($isReady || $isComplete)) {
				$checkbox.attr("disabled", "disabled");
			}
			$checkbox.appendTo($checkBoxCell);

			$('<label>', {
				"for": "file-"+$fileId+"-clone",
				"class": "checkbox"
			}).appendTo($checkBoxCell);

			$clone.find('td:first').before($checkBoxCell);

			$clone.wrapInner( "<td colspan='100%' style='padding: 0; border:none;border-radius: 5px;'><table class='fullwidth'><tbody class='clone-modal-tbody'><tr></tr></tbody></table><td>" );

			return $clone;
		},
		showFirstTdComparison: function() {
			$row = $(".modal.elementselectormodal").find("tr.clone-modal-tr");
			$row.each(function() {
				if ($(this).find("span.status").data("status") == 1) {
					self._addDiffViewEvent(this);
					$(this).find(".icon").removeClass("desc");
					$(this).find(".icon").addClass("asc");
					return false;
				}
			});
		},
		copyTextToClipboard: function(event) {
			var txt = $( event.currentTarget ).parent().children('.diff-bl').text();
			navigator.clipboard.writeText(txt).then(function() {
				Craft.cp.displayNotice(Craft.t('app', 'Copied to clipboard.'));
			}, function(err) {
				Craft.cp.displayError(Craft.t('app', 'Could not copy text: ', err));
			});
		},
		_buildPublishModal: function() {
			var $selections = self.getSelections();

			var $modal = $('<div/>', {
				'class' : 'modal elementselectormodal',
			});

			var $form = $('<form/>', {
				'id' : 'approve-publish-form',
				'method' : 'post'
			});

			$form.append(Craft.getCsrfInput());
			$form.append($('<input type="hidden" name="isProcessing" value="1"/>'));
			$form.append($('<input type="hidden" name="action" value="translations/order/save-draft-and-publish"/>'));
			$form.append($('<input type="hidden" name="orderId" value="'+$('input[name=orderId]').val()+'"/>'));

			$body = $('<div class="body pt-10" style="position: absolute; overflow: scroll; height: calc(100% - 132px); width: 100%;"></div>');

			var $header = $('<div class="header df"><h1 class="mr-auto">Review changes</h1></div>');
			var $footer = $('<div class="footer"><div class="select-all-checkbox"></div><div class="buttons right"></div></div>');
			var $draftButton = $('<button type="submit" name="submit" class="btn apply-translation disabled" style="margin:0 5px;" disabled value="draft">Merge into draft</button>');
			var $selectAllCheckbox = $('<input class="checkbox clone" id="element-0-clone" type="checkbox"/><label class="checkbox" for="element-0-clone">Select all</label>');
			var $publishButton = $('<button type="submit" name="submit" class="btn submit apply-translation disabled" style="margin:0 5px;" disabled value="publish">Merge and apply draft</button>');
			var $closeIcon = $('<a class="icon delete close-publish-modal" id="close-publish-modal" style="margin-left:15px;"></a>');

			$($closeIcon).on('click', function() {
				$('.modal.elementselectormodal, .modal-shade').remove();
			});

			$($draftButton).on('click', function() {
				$draftButton.addClass('disabled').css('pointer-events', 'none');
				$publishButton.addClass('disabled').css('pointer-events', 'none');
			});

			$($publishButton).on('click', function() {
				$draftButton.addClass('disabled').css('pointer-events', 'none');
				$publishButton.addClass('disabled').css('pointer-events', 'none');
			});

			$selectAllCheckbox.appendTo($footer.find('.select-all-checkbox'));
			$draftButton.appendTo($footer.find('.buttons'));
			$publishButton.appendTo($footer.find('.buttons'));
			$closeIcon.appendTo($header);
			$header.appendTo($form);
			$footer.appendTo($form);
			$('<div class="resizehandle"></div>').appendTo($form);

			var $table = $('<table class="data fullwidth" dir="ltr" style="border-spacing: 0 1em;"></table>');

			var $tableContent = $('<tbody></tbody>');

			$selections.each(function() {
				$clone = self.createRowClone(this);
				$clone.appendTo($tableContent);
				$('<tr>', {
					id: "data-"+$($clone).data("file-id")
				}).appendTo( $clone.find(".clone-modal-tbody") );
			});

			$($tableContent).on('click', '.diff-clone-row', function(e) {
				$row = $(this).closest('tr.diff-clone');
				isCollapsable = $row.find("span.status").data("status") == 1;

				if (! isCollapsable) {
					return;
				}

				$fileId = $row.data("file-id");
				$target = $("#data-"+$fileId);
				$icon = $row.find(".icon");
				if ($target.children().length > 0) {
					$target.toggle();
					if ($target.is(":visible")) {
						$($icon).removeClass("desc");
						$($icon).addClass("asc");
					} else {
						$($icon).removeClass("asc");
						$($icon).addClass("desc");
					}
				} else {
					self._addDiffViewEvent($row);
					$($icon).removeClass("desc");
					$($icon).addClass("asc");
				}
			});

			$tableContent.appendTo($table);

			$table.appendTo($body);
			$body.appendTo($form);
			$form.appendTo($modal)

			return $modal;
		},
		_addDiffViewEvent: function(that) {
			$fileId = $(that).data("file-id");
			if ($fileId == undefined) {
				return;
			}
			var fileData = {
				fileId: $fileId
			};

			Craft.sendActionRequest('POST', 'translations/files/get-file-diff', {data: fileData})
				.then((response) => {
					data = response.data.data;

					diffHtml = self.createDiffHtmlView(data);
					diffHtml.attr("id", "data-"+$fileId)
					$("#data-"+$fileId).replaceWith(diffHtml);
					diffHtml.show();
				})
				.catch(() => {
					Craft.cp.displayNotice(Craft.t('app', response.error));
				})
				.finally(() => {
					// Copy text to clipboard
					var $copyBtn = $("#data-"+$fileId).find('.diff-copy');
					$($copyBtn).on('click', function(event) {
						self.copyTextToClipboard(event);
					});
				});
		},
		createDiffHtmlView: function(data) {
			var diffData = data.diff;

			let tabBarClass = diffData == undefined ? 'hidden' : '';

			let previewClass = data.previewClass;
			let previewTitle = previewClass == 'disabled' ? "Preview not available" : 'Preview';
			let previewTabStyle = previewClass == 'disabled' ? 'style="cursor: default;"' : '';

			$mainContent = $('<tr>', {
				id: "main-container"
			});
			$mainContent.addClass('file-diff-data');

			$previewTab = $('<nav id="acc-tabs" class="preview pane-tabs '+tabBarClass+'">\
				<ul>\
					<li data-id="xml">\
						<a id="xml-'+data.fileId+'" class="tab sel tab-xml" title="XML">Text</a>\
					</li>\
					<li data-id="preview" class='+previewClass+' '+previewClass+'>\
						<a id="preview-'+data.fileId+'" class="tab tab-visual" title="'+previewTitle+'" '+previewTabStyle+'">Preview</a>\
					</li>\
				</ul>\
			</nav>');

			$previewTab = $('<nav id="acc-tabs" class="preview pane-tabs '+tabBarClass+'">\
				<ul>\
					<li data-id="xml">\
						<a id="xml-'+data.fileId+'" class="tab sel tab-xml" title="XML">Text</a>\
					</li>\
					<li data-id="preview" class='+previewClass+' '+previewClass+'>\
						<a id="preview-'+data.fileId+'" class="tab tab-visual" title="'+previewTitle+'" '+previewTabStyle+'">Preview</a>\
					</li>\
				</ul>\
			</nav>');

			$diffTable = $('<table>', {
				id: "diffTable-"+data.fileId,
				class: "diffTable"
			});
			$mainTd = $('<td colspan=8>');
			$mainTd.css({
				"border": "none",
				"border-radius": "5px",
				"padding": "0",
			});
			$previewTab.appendTo($mainTd);
			$diffTable.appendTo($mainTd);
			$previewContent = $('<div id="visual-'+data.fileId+'" class="visual" style="display: none; position: relative;">\
				<span class="iframe-line"> </span>\
				<iframe class="original" id="original-url" src="'+data.originalUrl+'"></iframe>\
				<iframe style="float: right" class="new" id="new-url" src="'+data.newUrl+'"></iframe>\
			</div>');
			$previewContent.appendTo($mainTd);
			$mainTd.appendTo($mainContent);

			$.each(diffData, function(key, value) {
				$tr = $('<tr>');
				$td = $("<td class='source'>");
				$td.appendTo($tr);
				$("<label>", {
					html: key+" :",
					class: "diff-tl"
				}).appendTo($td);
				$("<div>", {
					html: '<svg height="1em" viewBox="0 0 24 24" width="1em"><path d="M0 0h24v24H0z" fill="none"></path><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path></svg>',
					class: 'diff-copy'
				}).appendTo($td);
				$('<br>').appendTo($td);
				$("<span>", {
					html: value.source,
					class: "diff-bl"
				}).appendTo($td);
				$td = $("<td class='target'>").appendTo($tr);
				$td.appendTo($tr);
				$("<label>", {
					html: key+" :",
					class: "diff-tl"
				}).appendTo($td);
				$("<div>", {
					html: '<svg height="1em" viewBox="0 0 24 24" width="1em"><path d="M0 0h24v24H0z" fill="none"></path><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path></svg>',
					class: 'diff-copy'
				}).appendTo($td);
				$('<br>').appendTo($td);
				$("<span>", {
					html: value.target,
					class: "diff-bl"
				}).appendTo($td);
				$tr.appendTo($diffTable);
			});

			$previewTab.on('click', 'li', function() {
				let tab = $(this);
				let tabName = tab.data('id');
				let tabAnchor = tab.find('a');
				let tabFileId = tabAnchor.prop('id').split('-')[1];
				if (tabAnchor.hasClass('sel') || tab.hasClass('disabled')) {
					return;
				}

				if (tabName == 'xml') {
					$('#xml-'+tabFileId).addClass('sel');
					$('#preview-'+tabFileId).removeClass('sel');
					$('#visual-'+tabFileId).hide();
					$('#diffTable-'+tabFileId).show();
				} else {
					$('#xml-'+tabFileId).removeClass('sel');
					$('#preview-'+tabFileId).addClass('sel');
					$('#diffTable-'+tabFileId).hide();
					$('#visual-'+tabFileId).show();
				}
			});

			return $mainContent;
		},
		_buildFileActions: function() {
			$draftButtonClass = 'disabled noClick';
			if (hasCompleteFiles) $draftButtonClass = '';

			$menu = $('<div>', {'class': 'menu'});
            $menu.insertAfter($('#file-actions-menu-icon'));

            $dropdown = $('<ul>', {'class': ''});
            $menu.append($dropdown);

            // Rebuild draft preview button
            $updateLi = $('<li>');
            $dropdown.append($updateLi);

            $updateAction = $('<a>', {
                'href': '#',
				'class': $draftButtonClass,
                'text': 'Rebuild draft previews',
            });
            $updateLi.append($updateAction);
            if (hasCompleteFiles) this._addRebuildDraftPreviewAction($updateAction);

            // Download preview links as csv button
            $updateAndDownloadAction = $('<a>', {
                'href': '#',
				'class': $draftButtonClass,
                'text': 'Download preview links	',
            });
            $updateLi.append($updateAndDownloadAction);
            if (hasCompleteFiles) this._addDownloadPreviewLinksAction($updateAndDownloadAction, true);

            // Download/Sync TM Files Button
            $dropdown.append($('<hr>'));
            $downloadTmLi = $('<li>');
            $dropdown.append($downloadTmLi);
            $label = (isDefaultTranslator ? 'Download ' : 'Sync ') + 'memory alignment files';

            $downloadTmAction = $('<a>', {
                'href': '#',
                'class': isTmAligned ? 'link-disabled' : '',
                'text': $label,
            });
            $downloadTmLi.append($downloadTmAction);
            this._addDownloadTmFilesAction($downloadTmAction);
		},
		_addRebuildDraftPreviewAction: function(that) {
			var $form = $('#regenerate-preview-urls');
			$(that).on('click', function(e) {
				e.preventDefault();
				self.toggleLoader(true);

				var files = [];
				$rows = self.getFiles(true);
				$rows.each(function() {
					files.push($(this).data('file-id'));
				});

				$hiddenFlow = $('<input>', {
                    'type': 'hidden',
                    'name': 'files',
                    'value': JSON.stringify(files)
                });
                $hiddenFlow.appendTo($form);

				$form.submit();
			});
		},
		_addDownloadPreviewLinksAction: function(that) {
			$(that).on('click', function(e) {
				e.preventDefault();
				self.toggleLoader(true);
				if (hasOrderId) {
					var files = [];
					$rows = self.getFiles(true);
					$rows.each(function() {
						files.push($(this).data('file-id'));
					});
					$data = {
						'id': $("input[type=hidden][name=id]").val(),
						'files': JSON.stringify(files)
					};

					Craft.sendActionRequest('POST', 'translations/export/export-preview-links', {data: $data})
						.then((response) => {
							if (response.data.previewFile) {
								var $iframe = $('<iframe/>', { 'src': Craft.getActionUrl('translations/files/export-file', { 'filename': response.data.previewFile }) }).hide();
								$('#regenerate-preview-urls').append($iframe);
								self.toggleLoader();
							}
						})
						.catch(() => {
							Craft.cp.displayError(Craft.t('app', 'Unable to download your file.'));
							self.toggleLoader();
						});
				}
			});
		},
		_addDownloadTmFilesAction: function(that) {
			var self = this;
            var action = isDefaultTranslator ? 'download' : 'sync';
            $(that).on('click', function(e) {
                e.preventDefault();
				self.toggleLoader(true);

                var files = [];
                $rows = self.getFiles(true);
                $rows.each(function() {
                    files.push($(this).data('file-id'));
                });

                $data = {
                    files: JSON.stringify(files),
                    orderId: $("input[type=hidden][name=id]").val()
                }

                actions = {
                    download: 'translations/files/create-tm-export-zip',
                    sync: 'translations/files/sync-tm-files'
                }

                Craft.sendActionRequest('POST', actions[action], {data: $data})
					.then((response) => {
						if (!isDefaultTranslator) {
							Craft.cp.displayNotice('Translation memory files sent successfully.');
							location.reload();
						} else if (response.data.tmFiles) {
							let $downloadForm = $('#regenerate-preview-urls');
							let $iframe = $('<iframe/>', {'src': Craft.getActionUrl('translations/files/export-file', {'filename': response.data.tmFiles})}).hide();
							$downloadForm.append($iframe);
							setTimeout(function() {
								location.reload();
							}, 100);
						}
					})
					.catch(() => {
						Craft.cp.displayError(Craft.t('app', 'Unable to '+ action +' files.'));
						self.toggleLoader();
					});

            });
		},
		toggleLoader: function(show = false) {
			if (show) {
				$('#file-actions').addClass('disabled noClick');
			} else {
				$('#file-actions').removeClass('disabled noClick');
			}
			$('#files').find('.translations-loader').toggleClass('spinner hidden');
        },
		getFiles: function($selected = false) {
			$elementCheckboxes = $('#files tbody .file :checkbox');
			if ($selected) {
				return $elementCheckboxes.filter(':checked').closest('tr');
			}
			return $elementCheckboxes.closest('tr');
		}
	};

	$(function() {
		Craft.Translations.OrderEntries.init();
	});

})(jQuery);
