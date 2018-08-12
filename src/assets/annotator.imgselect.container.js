/* ImageSelect - image selection and annotation for annotator

Requires imgAreaSelect.js.
http://odyniec.net/projects/imgareaselect/

Specify the image(s) to be selected when including the module, e.g.

    .include(annotatorImageSelect, {
        element: $('.content img'),
    })


*/
var _t = annotator.util.gettext;
var global = this; // equivalent to previously used annotator.util.getGlobal()
var scale = 1.0; // zoom scale

// maxZIndex returns the maximum z-index of all elements in the provided set.
function maxZIndex(elements) {
    var max = -1;
    for (var i = 0, len = elements.length; i < len; i++) {
        var $el = $(elements[i]);
        if ($el.css('position') !== 'static') {
            // Use parseFloat since we may get scientific notation for large
            // values.
            var zIndex = parseFloat($el.css('z-index'));
            if (zIndex > max) {
                max = zIndex;
            }
        }
    }
    return max;
}

// Helper function to inject CSS into the page that ensures Annotator elements
// are displayed with the highest z-index.
// taken from annotator.js
function injectDynamicStyle() {
    $('#annotator-dynamic-style').remove();

    var sel = '*' +
              ':not(annotator-adder)' +
              ':not(annotator-outer)' +
              ':not(annotator-notice)' +
              ':not(annotator-filter)';

    // use the maximum z-index in the page
    var max = maxZIndex($(global.document.body).find(sel).get());

    // but don't go smaller than 1010, because this isn't bulletproof --
    // dynamic elements in the page (notifications, dialogs, etc.) may well
    // have high z-indices that we can't catch using the above method.
    max = Math.max(max, 1000);

    var rules = [
        ".annotator-adder, .annotator-outer, .annotator-notice {",
        "  z-index: " + (max + 20) + ";",
        "}",
        ".annotator-filter {",
        "  z-index: " + (max + 10) + ";",
        "}"
    ].join("\n");

    $('<style>' + rules + '</style>')
        .attr('id', 'annotator-dynamic-style')
        .attr('type', 'text/css')
        .appendTo('head');
}

// Helper function to remove dynamic stylesheets
function removeDynamicStyle() {
    $('#annotator-dynamic-style').remove();
}

// Helper function to add permissions checkboxes to the editor
function addPermissionsCheckboxes(editor, ident, authz) {
    function createLoadCallback(action) {
        return function loadCallback(field, annotation) {
            field = $(field).show();

            var u = ident.who();
            var input = field.find('input');

            // Do not show field if no user is set
            if (typeof u === 'undefined' || u === null) {
                field.hide();
            }

            // Do not show field if current user is not admin.
            if (!(authz.permits('admin', annotation, u))) {
                field.hide();
            }

            // See if we can authorise without a user.
            if (authz.permits(action, annotation, null)) {
                input.attr('checked', 'checked');
            } else {
                input.removeAttr('checked');
            }
        };
    }

    function createSubmitCallback(action) {
        return function submitCallback(field, annotation) {
            var u = ident.who();

            // Don't do anything if no user is set
            if (typeof u === 'undefined' || u === null) {
                return;
            }

            if (!annotation.permissions) {
                annotation.permissions = {};
            }
            if ($(field).find('input').is(':checked')) {
                delete annotation.permissions[action];
            } else {
                // While the permissions model allows for more complex entries
                // than this, our UI presents a checkbox, so we can only
                // interpret "prevent others from viewing" as meaning "allow
                // only me to view". This may want changing in the future.
                annotation.permissions[action] = [
                    authz.authorizedUserId(u)
                ];
            }
        };
    }

    editor.addField({
        type: 'checkbox',
        label: _t('Allow anyone to <strong>view</strong> this annotation'),
        load: createLoadCallback('read'),
        submit: createSubmitCallback('read')
    });

    editor.addField({
        type: 'checkbox',
        label: _t('Allow anyone to <strong>edit</strong> this annotation'),
        load: createLoadCallback('update'),
        submit: createSubmitCallback('update')
    });
}

// Returns the absolute position of the mouse relative to the provided container
// based on annotator.js mousePosition
function containerMousePosition(event, container) {
    var offset = $(container).offset();

    return {
        top: (event.pageY - offset.top) / scale,
        left: (event.pageX - offset.left) / scale
    };
}

function annotatorImageSelectContainer(options) {
  options = $.extend({
      container: global.document.body,
      editorExtensions: [],
      viewerExtensions: [],
      suppressArrowKeys: false,
      scale: 1.0
  }, options);

  // Object to hold local state
  var s = {
    interactionPoint: null,
    ias: null
  };

  // utility methods to support image annotation
  var imgselect_utils = {
    // image area inital setup
    selectionSetup: function() {
      $('click.imgselection, .imgareaselect-outer, .annotator-cancel')
        .on('click', function(e) {
          $(".tmp-img-selection").remove();
        });
      // escape key exits editor, so should also clear temporary selection
      $('.annotator-editor textarea').on('keydown', function(e) {
        if (e.which === 27) {  // escape
          $(".tmp-img-selection").remove();
        }
        
        // suppress arrow keys, if needed
        if (options.suppressArrowKeys && e.which >= 37 && e.which <= 40) {
          e.stopPropagation();
        }
      });
      return true;
    },

    hideAnnotatorEditorAdder: function() {
      // hide annotator editor window, adder button, and deselect text
      // whenever an image selection is drawn or adjusted

      // hide editor if visible
      var $visible_editor = $(".annotator-editor:not(.annotator-hide)");
      if ($visible_editor.length > 0){
        $visible_editor.addClass('annotator-hide');
        // Remove the temporary boxes if the annotation was not created
        $('.tmp-img-selection').remove();
      }
      // hide the adder whenever a new selection is started
      s.adder.hide();
      // unselect any selected text to avoid confusion
      // between text/image selection & annotation
      global.getSelection().removeAllRanges();
    },

    // image area selection start event
    selectionStart: function(img, selection) {
      imgselect_utils.hideAnnotatorEditorAdder();
    },

    // image area selection change event
    selectionChange: function(img, selection) {
      imgselect_utils.hideAnnotatorEditorAdder();
    },

    // image area selection end event
    selectionEnd: function(img, selection) {
      // only display adder once selection gets above a certain
      // minimum size
      // TODO: make min size configurable (?)
      if (selection.width < 25 || selection.height < 25) {
        return;
      }
      // create a preliminary annotation object.
      // based on makeAnnotation from annotator.ui.main
      var annotation =  {
        quote: '',   // image selection = no text quotation
        // NOTE: normal highlights include xpath dom ranges
        // we don't have anything like that, but annotator
        // seems happy enough with an empty list.
        ranges: [],
        // image selection details
        image_selection: imgselect_utils.imageSelection(img, selection)
      };

      $(".annotator-adder+div").addClass('active-img-selection');
      // calculate "interaction point" - using top right of selection box
      s.interactionPoint = imgselect_utils.selectionPosition(img, selection);
      // show the annotation adder button
      s.adder.load(annotation, s.interactionPoint);

      // set editor window is not positioned relative to the adder element
      var offset = $(s.adder.element[0]).offset();
      if (offset){
        $(".annotator-editor").css({
          top: offset.top + 50,
          left: offset.left - (selection.width/2)
        });
      }
    },

    // draw a highlight element for an image annotation
    drawImageHighlight: function(annotation) {
      // if annotation is not an image selection annotation,
      // or does not provide needed attributes, skip
      if (! annotation.image_selection || ! annotation.image_selection.src) {
        return;
      }
      var imgselection = annotation.image_selection;
      var img = $('img[src$="' + imgselection.src + '"]').first();
      if (img.length === 0) {
        // if the highlighted image is not found, skip
        return;
      }
      // create a highlight element
      var hl = $(document.createElement('span'));
      hl.addClass('annotator-hl');
      // set position, width, height, annotation id
      hl.css({
        width: imgselection.w,
        height: imgselection.h,
        left: imgselection.x,
        top: imgselection.y,
        position: 'absolute',
        display: 'block'
      });
      // Add a data attribute for annotation id if the annotation has one
      if (typeof annotation.id !== 'undefined' && annotation.id !== null) {
       hl.attr('data-annotation-id', annotation.id);
     }
     // Save the annotation data on each highlighter element.
     hl.attr('data-annotation', JSON.stringify(annotation));

     // add highlight to img parent element
     // NOTE: this relies on readux style/layout for correct placement
     img.parent().append(hl);

      // return the added highlight element
      return hl;
    },

    // get position from image + selection
    selectionPosition: function(img, selection) {
      // based on annotator.util.mousePosition
      var offset = $(options.container).offset();
      // get position based on image offset + selection position
      var img_offset = $(img).offset();
      
      // setting adder to top right corner of selection for now
      return {
        top: (((img_offset.top - offset.top) / scale) + selection.y1),
        left: (((img_offset.left - offset.left) / scale) + selection.x2)
      };
    },

    percent: function(val) {
      // convert image position/size number into percentage
      // for storing in the annotation and displaying highlight
      return Number(val*100).toFixed(2) + '%';
    },

    imageSelection: function(img, selection) {
      // image selection information to be
      // stored with the annotation, so that we can load
      // and display highlighted region

      var percent = imgselect_utils.percent;

      // storing all dimensions as percentages so it can
      // be scaled for different sizes if necessary
      var w = (selection.x2 - selection.x1) / img.width,
         h = (selection.y2 - selection.y1) / img.height;
      return {
        // full uri to the image
        uri: img.src,
        // store src as it appears in the document, so we can find it again
        src: $(img).attr('src'),
        x: percent(selection.x1 / img.width),
        y: percent(selection.y1 / img.height),
        w: percent(w),
        h: percent(h)
      };
    },

  };

  // export annotator module hooks
  return {

    // when annotator starts, load & configure image selection
      start: function (app) {
          if (!jQuery.imgAreaSelect || typeof jQuery.imgAreaSelect !== 'function') {
              console.warn(_t("To use the ImageSelect annotator module, you must " +
                  "include imgAreaSelect in the page."));
              return;
          }
          // NOTE: might be possible to set fallback logic to identify
          // annotable image content, but this is probably good enough for now.
          if (! options.element) {
              console.warn(_t("To use the ImageSelect annotator module, you must " +
                  "configure elements for image selection."));
              return;
          }
          
          scale = options.scale;

          // enable image selection on configured annotatable image
          var ias_opts = {
              instance: true,  // return an instance for later interaction
              handles: true,
              onInit: imgselect_utils.selectionSetup,
              onSelectStart: imgselect_utils.selectionStart,
              onSelectChange: imgselect_utils.selectionChange,
              onSelectEnd: imgselect_utils.selectionEnd,
              keys: false,  // disable keyboard shortcuts because they conflict with annotator keys
              parent: options.container,
              scale: options.scale
           }
          // NOTE: imgAreaSelect is supposed to handle multiple elements,
          // but cancelSelection does NOT work on secondary images
          // As a workaround, initialize one imgAreaSelect instance for
          // each image configured for image annotation
          s.ias = $(options.element).toArray().map(function(el) {
              return $(el).imgAreaSelect(ias_opts);
          });

          // Customize the mouse cursor to indicate when configured image
          // can be selected for annotation.
          options.element.css({'cursor': 'crosshair'});

          // create annotation adder
          // borrowed from annotator.ui.main
          s.adder = new annotator.ui.adder.Adder({
            onCreate: function (ann) {
                s.viewer.mouseDown = false; // bugfix for faulty mouse state when clicking adder
                app.annotations.create(ann);
            },
            appendTo: options.container
          });
          s.adder.attach();
          
          s.editor = new annotator.ui.editor.Editor({
            extensions: options.editorExtensions,
            appendTo: options.container
          });
          s.editor.attach();
          
          var ident = app.registry.getUtility('identityPolicy');
          var authz = app.registry.getUtility('authorizationPolicy');
          addPermissionsCheckboxes(s.editor, ident, authz);
          
          s.viewer = new annotator.ui.viewer.Viewer({
            onEdit: function (ann) {
                // Copy the interaction point from the shown viewer:
                s.interactionPoint = $(s.viewer.element).css(['top', 'left']);

                app.annotations.update(ann);
            },
            onDelete: function (ann) {
                app.annotations['delete'](ann);
            },
            permitEdit: function (ann) {
                return authz.permits('update', ann, ident.who());
            },
            permitDelete: function (ann) {
                return authz.permits('delete', ann, ident.who());
            },
            autoViewHighlights: $(options.element).parent()[0],
            extensions: options.viewerExtensions,
            appendTo: options.container
          });
          
          // Patch _onHighlightMouseover to calculate correct coordinates for viewer.
          s.viewer.__proto__._onHighlightMouseover = function (event) {
              // If the mouse button is currently depressed, we're probably trying to
              // make a selection, so we shouldn't show the viewer.
              if (this.mouseDown) {
                  return;
              }

              var self = this;
              this._startHideTimer(true)
                  .done(function () {
                      var annotations = $(event.target)
                          .parents('.annotator-hl')
                          .addBack()
                          .map(function (_, elem) {
                              return $(elem).data("annotation");
                          })
                          .toArray();

                      // Now show the viewer with the wanted annotations
                      self.load(annotations, containerMousePosition(event, self.options.appendTo));
                  });
          }
          
          s.viewer.attach();
          
          injectDynamicStyle();

          return true;
      },
      
      destroy: function () {
          s.adder.destroy();
          s.editor.destroy();
          s.viewer.destroy();
          removeDynamicStyle();
      },

      beforeAnnotationCreated: function(annotation) {
        // hide the image selection tool
        s.adder.hide();
        // cancel image selection box if there is one
        // (mirrors annotator logic for unselecting text)
        if (s.ias !== null) {
          $.each(s.ias, function(idx, ias){ias.cancelSelection();});
        }

        // if this is an image annotation,
        // create a temporary highlight to show what is being annotated
        if (annotation.image_selection && annotation.image_selection.src) {
          var tmp_hl = imgselect_utils.drawImageHighlight(annotation);
          if (tmp_hl) {
            tmp_hl.addClass('tmp-img-selection').removeClass('annotator-hl');
          }
        }
        // Editor#load returns a promise that is resolved if editing
        // completes, and rejected if editing is cancelled. We return it
        // here to "stall" the annotation process until the editing is
        // done.
        return s.editor.load(annotation, s.interactionPoint);
      },
      
      beforeAnnotationUpdated: function (annotation) {
          return s.editor.load(annotation, s.interactionPoint);
      },

      annotationCreated: function(annotation) {
        // hide the temporary highlight
        $(".active-img-selection").removeClass('.active-img-selection');
        // remove temporary selection
        $(".tmp-img-selection").remove();
        // show image highlight div for new image annotation
        imgselect_utils.drawImageHighlight(annotation);
        return true;
      },

      // nothing to do for annotationUpdated
      // (image selection not currently editable)

      beforeAnnotationDeleted: function(annotation) {
        // remove highlight element for deleted image annotation
        if (annotation.id && annotation.image_selection) {
            $('.annotator-hl[data-annotation-id='+ annotation.id +']').remove();
        }
        return true;
      },
      
      // Executed when an anotation is deleted
      annotationDeleted: function (annotation) {
        // Get the box area and remove it
        $('span.annotator-hl[data-annotation-id=' + annotation.id + ']').remove();
      },

      annotationsLoaded: function(annotations) {
        // look for any annotations with an image-selection
        // and create positioned div based on the selection coordinates
        // using the same styles as text annotations.
        $.each(annotations, function(i){
          imgselect_utils.drawImageHighlight(annotations[i]);
        });
        // return true so annotator will draw text highlights normally
        return true;
      },
      
      isImgSelectContainerModule: true,
      
      setScale: function(newScale) {
        scale = newScale;
        if (s.ias !== null) {
          $.each(s.ias, function(idx, ias){
              ias.setScale(newScale);
          });
        }
      },

  };
}
