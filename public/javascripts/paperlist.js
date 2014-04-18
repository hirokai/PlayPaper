var log = function(d){console.log(d);};

var oTable;

var rowChecked = {};
var ajaxRes;

function parseMisc(dat){
    var res = _.map(dat,function(paper){
        var m = paper.misc;
        paper.misc = (m && m != "") ? JSON.parse(m) : {};
        return paper;
    });
    return res;
}

function initDataTables(){
   $.get('list.json',function(res){
        ajaxRes = parseMisc(res);
        var aaData = getData(ajaxRes);
        var tags = collectTags(res);
        log(tags);
        showMessage('Welcome.');
        oTable = $('#list').dataTable({
//            "iDisplayLength": 20,
            bAutoWidth : true,
            aaData: aaData,
            bStateSave: true,
            aoColumns: [
            { "sTitle": "<input id='check-multi' type='checkbox'>", sClass: "check", bSortable: false},
            { "sTitle": "Title", sClass: "title"},
            { "sTitle": "Journal",sClass: "citation" },
            { "sTitle": "Year",sClass: "year" },
            { "sTitle": "Authors", sClass: "authors" },
            { "sTitle": "Tags", sClass: "tags" },
            { "sTitle": "View", sClass: "view" },
            { "sTitle": "Saved", sClass: "availability drop-file" },
            { "sTitle": "Action", sClass: "action" },
            { "sTitle": "Added date",sClass:"date" }
            ],
            aoColumnDefs  : [
            {
                aTargets: [0],    // Column number which needs to be modified
                fnRender: function (o, v) {   // o, v contains the object and value for the column
                    return '<input type="checkbox" data-id="'+v[0]+'" class="entry-check"'+(v[1] ? ' checked="checked"' : '')+'/>';
                },
                sClass: 'tableCell'    // Optional - class to be applied to this table cell
            }],
            fnInitComplete: function(){
                $('#check-multi').click(function(e){
                    if($(this).is(':checked'))
                        fnSelectAll();
                    else
                        fnDeselectAll();
                });
            }
        });
        $('#list_length').prepend($('#tools-template').html());

        $('.link-pdf').on('click',function(){
            var options = {success: function(files){
                    console.log(files[0].link);
                    $.post('/paper/add_pdflink',{url: files[0].link});
                },
                linkType: "direct"
                , multiselect: false
                , extensions: ['.pdf']
            };
            Dropbox.choose(options);
        });
        $('.remove-entry').on('click',function(e){
            var el = $('#action-confirm');
            var btngrp = $(e.target).parent().parent().parent();
            var id = btngrp.attr('data-id');
            var title = $(e.target).parent().parent().parent().parent().parent().find('td.title').text();
            $('.modal-title',el).text('Delete entry');
            $('.message',el).text('Are you sure you want to delete this paper from database? This cannot be undone.');
            $('.title-placeholder',el).html(title);
            $('#action-ok',el).attr('data-action','delete');
            $('#action-ok',el).attr('data-id',id);
            el.modal();
        });
        $('#action-confirm #action-ok').on('click',function(e){
            var action = $(e.target).attr('data-action');
            if(action=='delete'){
                var id = $(e.target).attr('data-id');
                $.post('/paper/delete/'+id,function(res){
                        location.reload();
                });                       
            }else if (action == 'delete-multi'){
                var id = $(e.target).attr('data-id');
                var ids = id.split('::').join('\n');
                $.post('/paper/delete_multi',{id:ids},function(res){
                    if(res.success){
                        location.reload();
                    }
                });                                       
            }
        });
        $('.edit-tag-multi').click(function(e){
            console.log(e);
        });
        $('.entry-check').on('change',function(e){
            var el = $(e.target);
            var id = el.attr('data-id');
            rowChecked[id] = e.target.checked;
        });
        $('.delete-multi').click(function(e){
            var selectedIds = fnGetSelected();
            deletePapersDialog(selectedIds);
        });
        $('.show-info').click(function(e){
            var btngrp = $(e.target).parent().parent().parent();
            var id = btngrp.attr('data-id');
            showInfo(paperById(id));
        });

        // Just some styling for the drop file container.
        $('.drop-file').on('dragover', function() {
            return false;
        });
        $('.drop-file').on('dragenter', function(e) {
            $(e.target).addClass('drag-hover');
            return false;
        });

        $('.drop-file').on('dragleave', function(e) {
            $(e.target).removeClass('drag-hover');
            return false;
        });
        
        $('.drop-file').on('drop', function(e) {
            $(e.target).removeClass('drag-hover');
            var files = e.dataTransfer.files;
//            if(files.length == 1){
                try{
                    var pid = $(e.target).parents('tr').attr('data-id');
//                    if(files[0].type == 'application/pdf'){
                        uploadFile(pid,files);
//                    }else{
//                        showMessage('You can only upload PDF.');
//                    }
                }catch(e){
                    console.log(e);
                }
//            }else{
//                showMessage('You can only upload one file at a time.');
//            }
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
        $('table#list tr').each(function(){
            var id = $('td.check input',this).attr('data-id');
            if(id)
                $(this).attr('data-id',id);
        });

        // $('.pdf-link').click(function(e){
        //     var id = $(e.target).parents('tr').attr('data-id');
        //     window.open('/paper/attachment/'+id);
        // });
    });
}

function uploadFile(pid,files){
    if(!pid) return;

    var numFiles = files.length;
    console.log('Uploading '+numFiles+' files.')

    var count = 0;

    _.each(files,function(file){
        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function(f) {
          return function(e) {
               console.log(f.type);
                var content = e.target.result;
                if(content.length > 30000000){
                    showMessage('Error: File too large.');
                }else{
                   $.post('/paper/attach_file/'+pid,{data: content},function(res){
                     console.log(res);
                     if(res.success){
                        showMessage('Attachement file uploaded: '+f.name);                
                     }else{
                         showMessage('Upload failed.');                                
                     }
                    count += 1;
                    if(count >= numFiles){
                        location.reload();
                    }
                   });
                }
          };
            })(file);

          // Read in the image file as a data URL.
        reader.readAsDataURL(file);
    })
}

$(document).ready(function() {
    jQuery.event.props.push('dataTransfer');
    initDataTables();

$('body').keydown(function(e){
    if($('input:focus').length > 0 || $('.modal:visible').length > 0)
        return;

    switch(e.keyCode) {
        case 39:  //right
        case 76:  //l
        oTable.fnPageChange('next');
        $('#list').height(tableFixedHeight);
        break;
        case 37: //left
        case 72:  //h
        oTable.fnPageChange('previous');
        $('#list').height(tableFixedHeight);
        break;
    }

});

// add an event listener to a Chooser button
$(".db-chooser").on("DbxChooserSuccess",
    function(e) {
        console.log(e);
        window.alert("Here's the chosen file: " + e.originalEvent.files[0].link)
    });

$('#btn-analyze').click(function(){
    if(analysisMode){
        $('#analysis').fadeOut(200);
        $('#list_wrapper').fadeIn(200);
    }else{
        $('#list_wrapper').fadeOut(200);
        $('#analysis').fadeIn(200);
        drawAnalysis();
    }
    analysisMode = !analysisMode;
});


});
// End of $.ready()

var analysisMode = false;

var tableFixedHeight = 500;

var analysisInitialized = false;

function drawAnalysis() {
    var svg;
    var div = $('#analysis');
    if(!analysisInitialized){
//        div.html('');
        svg = d3.select('#analysis').append('svg')
                .attr('width',500).attr('height',500)
                .style('background','white');
        svg.append('text')
            .attr('x',0)
            .attr('y',30)
            .attr('width', 300)
            .attr('height',40)
            .attr('id','analysis-info');
        analysisInitialized = true;       
    }else{
        svg = d3.select('#analysis > svg');
    }
    var ids = fnGetFiltered();
    var ps = _.map(ids,function(id){
        var p = paperById(id);
        return p;
    });
    ps = _.sortBy(ps,function(p){return p.citation.journal;})
    console.log(ps);
    var len = ps.length;
    svg.selectAll('circle')
        .data(ps,function(d){return d.id;})
        .enter().append('circle')
        .attr('cx',function(d,i){return (Math.max(1980,d.citation.year)-1980)*10;})
        .attr('cy',function(d,i){return i*300/len;})
        .attr('r',5)
        .attr('fill','blue')
        .on('mouseenter',function(d){
            var t = d.citation.title;
            console.log(t);
            d3.select('#analysis-info').text(t);
        })
        .on('mouseover',function(d){
            d3.select('#analysis-info').html("");
        });
    var x = d3.scale.linear().range([1980,2015]);
    var xaxis = d3.svg.axis().ticks(10).tickSize(100);

    svg.selectAll("g.x.axis")
      .data([1980,1990,2000])
        .enter().append("svg:g")
      .attr("class", "x axis")
      .attr("transform", function(d, i) { return "translate(" + i * 100 + ",0)"; })
      .each(function(d) { d3.select(this).call(xaxis.scale(x[d]).orient("bottom")); });

}

function paperById(id){
    return _.find(ajaxRes,function(p){return p.id == id;});
}




function getData(res) {
    var dat = _.map(res,function(r){
        var c = r.citation;
        var viewhtml = _.template($('#view-item-template').html(),r);
        var actionhtml = _.template($('#action-template').html(),r);
        //"<div><a href='"+c.url+"'>Original</a>/<a href='/paper/c/"+r.id+"'>Go</a></div>"
        var cittxt = [c.journal,", ",c.volume,", ",c.pageFrom," (",c.year,")"].join("");
        var a = r.availability;
        var availability = (a.fulltext ? "<span class='label label-primary'>Full</span>" : (a.abstract ? "<span class='label label-default'>Abs</span>" : "N/A"))
            + (a.figures ? "<br><span class='label label-success'>Figs</span>" : "")
            + (a.references ? "<br><span class='label label-warning'>Refs</span>" : "")
            + (r.misc.attachedFile ? "<br><a class='pdf-link' href='/paper/attachment/"+r.misc.attachedFile+"'><span class='label label-pdf-link'>PDF</span></a>" : "");

        var tagshtml = "<div>" + r.tags.join(', ') + "</div>";

        //Stub: for now, cutting text to 300 chars to avoid layout breaking.
        return [[r.id,false],r.title.slice(0,300),c.journal,c.year,"<div>"+c.authors.join("; ").slice(0,100)+"</div>",
            tagshtml,
            viewhtml,availability,actionhtml,fmtDate(r.addedDate)];

    });
    return dat;
}

function deletePapersDialog(ids) {
    var el = $('#action-confirm');
    $('.modal-title',el).text('Delete entries');
    $('.message',el).text('Are you sure you want to delete '+ids.length+' papers from database? This cannot be undone.');
    $('#action-ok',el).attr('data-action','delete-multi');
    $('#action-ok',el).attr('data-id',ids.join('::'));
    el.modal();
}

function showInfo(paper){
    var el = $('#info-window');
    el.attr('data-id',paper.id);
    var tags = paper.tags || [];
    $('.modal-body',el).html(_.template($('#info-template').html(),paper));

    el2 = $('ul.tags');
     _.each(tags,function(t){
         el2.append('<li>'+t+'</li>')
     });
    el2.tagit({readOnly: false, allowSpaces: true});

    // $('#tags-edit').click(function(e){
    //     $('ul.tags').remove();
    //     var el = $('<ul>');
    //     el.attr('class','tags');
    //     _.each(tags,function(t){
    //         el.append('<li>'+t+'</li>')
    //     });
    //     $('#tags-container').prepend(el);
    //     el.tagit({readOnly: false});
    // });
    $('#input-comment').val(paper.misc.comment);

    $('#info-ok').click(function(e){
        var lis = $('ul.tags li');
        paper.tags = _.map(lis,function(el){
            return $(".tagit-label",el).text();
        });
        console.log(paper.tags);
        $.post('/paper/replace_tags',{id: paper.id, tags: paper.tags.join('\n')},function(res){
            showMessage(res.message);
        });
        paper.misc.comment = $('#input-comment').val();
        var str = JSON.stringify(paper.misc);
        console.log(str);
        $.post('/paper/replace_misc',{id: paper.id, json: str},function(res){
            showMessage(res.message);
        });
    });
    el.modal();
}

function fnGetSelected() {
    return _.filter(Object.keys(rowChecked),function(k){
        return rowChecked[k] == true;
    });
}

function fnGetFiltered() {
    var data = oTable._('tr', {"filter":"applied"});
//    console.log(data);
    return _.map(data,function(d){return $(d[0]).attr('data-id')});;
}

function fnSelectAll(){
    console.log('fnSelectAll()');
    var ids = fnGetFiltered();
    console.log(ids);
    _.each(ids,function(id){
        $('#list input.entry-check[data-id='+id+']').attr('checked', true);
    });
}

function fnDeselectAll(){
    console.log('fnDeselectAll()');
    var ids = fnGetFiltered();
    console.log(ids);
    _.each(ids,function(id){
        $('#list input.entry-check[data-id='+id+']').attr('checked',false);
    });
}

function collectTags(res) {
    var alltags = _.flatten(_.map(res.records,function(r){return r.tags;}));
    return _.countBy(alltags,function(e){return e;});
}

function showMessage(msg,t){
    var time = t || 3000;
    $('#statusbar').html(msg||"");
    $('#statusbar').show();
    window.setTimeout(function(){
        $('#statusbar').fadeOut(500);
    },time);
}

var fmtDate = function(str) {
    var d = new Date(str);
    return d.toLocaleString();
}