var currentPanel = "";
var currentSize = "";
var skillCache = {};
var featuredLocations = {};

function scrollToBottom(){ $("html, body").animate({ scrollTop: $(document).height()-$(window).height() }); }

function openNav(imageSource) {
    $("#overImage").attr("src",imageSource).removeClass("imgVer imgHor").addClass((isBootstrapSize('xs') || isBootstrapSize('sm')) ? 'imgVer':'imgHor');
    document.getElementById("myNav").style.height = "100%";
}
function closeNav() { document.getElementById("myNav").style.height = "0%"; }

$(window).resize(function() {
    var size = "md";
    size = (isBootstrapSize('xs') ? 'sx' : size); size = (isBootstrapSize('sm') ? 'sm' : size);
    size = (isBootstrapSize('md') ? 'md' : size); size = (isBootstrapSize('lg') ? 'lg' : size);
    if(size != currentSize){ currentSize = size; if(currentPanel != "") changePanel(currentPanel); }
});
function isBootstrapSize(alias) { return $('.device-' + alias).is(':visible'); }

function categoryById(id){ return (jsonData.categories || []).filter(function(c){return c.id===id;})[0]; }
function skillAnchor(ref){ return 'skill-' + ref.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase(); }
function buildFeaturedLocations(){
    featuredLocations={};
    $.each(jsonData.categories || [],function(_,category){
        $.each(category.skills || [],function(_,ref){
            if(!featuredLocations[ref]) featuredLocations[ref]=[];
            featuredLocations[ref].push(category.id);
        });
    });
}

function resizeCategCells(){
    var first=$('.gridbox').first(); if(!first.length) return;
    var picHeight=first.width(); $('.gridbox').css('height',picHeight+'px');
}

async function createCategories() {
    var holder=$("#Categories").empty();
    for(let categoryIndex=0;categoryIndex<(jsonData.categories || []).length;categoryIndex++) {
        let value=jsonData.categories[categoryIndex];
        var id=value.id+'Thumb';
        var box=$("<div>",{id:id,"class":"col-xs-6 col-sm-4 col-md-3 box1 gridbox"}).css('background-color',value.color || '#777');
        box.click(function(){changePanel(value.id);$(window).scrollTop(0);});
        var iconUrl=await PortfolioResources.resolveAsset(value.icon,jsonData._resourceBase);
        var img=$("<img>",{id:value.id+'Img',src:iconUrl,"class":"categCell"}).height('80%').width('80%');
        var title=$("<div>",{id:value.id+'Title',"class":"row categCellTitle"}).html('&nbsp;'+value.name).hide();
        box.append(img,title); holder.append(box);
        box.mouseenter(function(){title.show();img.animateCss('bounceIn');}).mouseleave(function(){title.hide();});
    }
    resizeCategCells();
}

async function getPage(page){
    showCategories();
    $('#skillsNav,#aboutNav,#mainNav').removeClass('active'); $('#'+page+'Nav').addClass('active');
    if($('#content').length) $('#content').remove();
    $('#contentHolder').append($("<div>",{id:'content'}));
    var pageHtml=await $.get(PortfolioResources.sharedAsset('pages/'+page+'.htm'));
    $('#content').html(pageHtml);
    var functionName='init'+page.toLowerCase().replace(/\b[a-z]/g,function(letter){return letter.toUpperCase();});
    if(typeof window[functionName]==='function') await window[functionName](); else eval(functionName+'()');
}

function createMeunCategories() {
    var menu=$('#SkillsDropdown').empty();
    $.each(jsonData.categories || [],function(_,value){
        menu.append('<li><a onclick="changePanel(\''+value.id+'\')" href="#">'+value.name+'</a></li>');
    });
}
function showCategories(){ $('#Categories').show(); resizeCategCells(); }

async function loadSkill(ref){
    if(!skillCache[ref]) skillCache[ref]=PortfolioResources.loadSkill(ref);
    return await skillCache[ref];
}

async function changePanel(panelID, targetSkillRef){
    currentPanel=panelID; showCategories();
    $('#aboutNav,#mainNav').removeClass('active'); $('#skillsNav').addClass('active'); $('#navbar').collapse('hide');
    var category=categoryById(panelID); if(!category){console.error('Unknown category',panelID);return;}

    var subjectHtml=await $.get(PortfolioResources.sharedAsset('subject.htm'));
    if($('#content').length) $('#content').remove();
    var divContent=$("<div>",{id:'content'}).append(subjectHtml); $('#contentHolder').append(divContent);

    $('#subjectTitle').text(category.intro.title || category.name);
    var introText=category.intro.text || '';
    if(category.intro.mobileText && isBootstrapSize('xs')) introText=category.intro.mobileText;
    $('#subjectText').html(introText);
    $('#subjectIMG').attr('src',await PortfolioResources.resolveAsset(category.intro.image,jsonData._resourceBase)).css({width:'100%',height:'auto'});

    var templates=await Promise.all([
        $.get(PortfolioResources.sharedAsset('skilltile.htm')),
        $.get(PortfolioResources.sharedAsset('skilltilenoImage.htm'))
    ]);
    var skillTileHTML=templates[0], skillTileNoImageHTML=templates[1];
    var holder=$('#skillTiles').empty();

    for(var index=0;index<(category.skills||[]).length;index++){
        var ref=category.skills[index], value;
        try { value=await loadSkill(ref); } catch(e){ console.error('Unable to load skill',ref,e); continue; }
        renderSkillTile(holder, category, ref, value, index, skillTileHTML, skillTileNoImageHTML);
    }

    if(targetSkillRef){
        setTimeout(function(){
            var target=$('#'+skillAnchor(targetSkillRef));
            if(target.length){ $('html,body').animate({scrollTop:Math.max(0,target.offset().top-20)},700); target.animateCss('pulse'); }
        },30);
    }
}

function renderSkillTile(holder, category, ref, value, index, skillTileHTML, skillTileNoImageHTML){
    var media=value.media || {}, hasPrimary=!!media.image || !!media.youtube;
    var html=hasPrimary ? skillTileHTML : skillTileNoImageHTML;
    var prefix='skill_'+index;
    var tileHTML=html.replace('--IMGID--',prefix+'_img').replace('--TITLEID--',prefix+'_title').replace('--TEXTID--',prefix+'_text')
        .replace('--YOUTUBEID--',prefix+'_youtube').replace('--IMGTABLE--',prefix+'_table').replace('--HTMLBLOCK--',prefix+'_block')
        .replace('--LEFTWIDTHID--',prefix+'_left').replace('--RIGHTWIDTHID--',prefix+'_right')
        .replace('--IMG--', media.image ? PortfolioResources.asset(media.image,value._resourceBase) : '');
    tileHTML=tileHTML.replace('--TITLESUBTEXT--',value.subtitle || '');
    var wrapper=$('<div>',{id:skillAnchor(ref),'data-skill-ref':ref}).html(tileHTML); holder.append(wrapper);
    $('#'+prefix+'_title').text(value.title || '');
    $('#'+prefix+'_text').html((value.mobileText && isBootstrapSize('xs')) ? value.mobileText : (value.text || ''));

    if(media.image){
        $('#'+prefix+'_youtube').remove();
        var imgUrl=PortfolioResources.asset(media.image,value._resourceBase);
        $('#'+prefix+'_img').attr('src',imgUrl).css({width:'100%',height:'auto'}).off('click').on('click',function(){openNav(imgUrl);});
    } else if(media.youtube){
        $('#'+prefix+'_img').remove(); $('#'+prefix+'_youtube').attr('src',media.youtube);
        if(isBootstrapSize('md')){$('#'+prefix+'_left').removeClass().addClass('col-md-5');$('#'+prefix+'_right').removeClass().addClass('col-md-7');}
    } else {
        $('#'+prefix+'_img,#'+prefix+'_youtube').remove();
    }

    if(media.gallery && media.gallery.length){
        var table=$('#'+prefix+'_table'), rowIndex=0, rowDiv=null;
        for(var tableIndex=0;tableIndex<media.gallery.length;tableIndex++){
            var path=media.gallery[tableIndex];
            var mobBy=isBootstrapSize('xs')?2:(isBootstrapSize('sm')?3:4);
            if(tableIndex % mobBy === 0){ rowDiv=$('<div>',{'class':'row top-buffer'}); table.append(rowDiv); rowIndex++; }
            var url=PortfolioResources.asset(path,value._resourceBase);
            var imageDiv=$('<div>',{'class':'col-xs-6 col-sm-4 col-md-3'}), img=$('<img>',{src:url,width:'100%',height:'auto'}).css({cursor:'pointer'});
            img.click(function(){openNav(url);}); imageDiv.append(img); rowDiv.append(imageDiv);
        }
    }
    if(media.htmlBlock) $('#'+prefix+'_block').html(media.htmlBlock);
}

function openFeaturedSkill(ref){
    var cats=featuredLocations[ref] || [];
    if(cats.length===0){ console.error('Featured skill is not present in a regular category:',ref); return; }
    changePanel(cats[0],ref);
}

// Legacy mobile read-more support retained for migrated content.
function readmore(params){
    if(params.split('~').length>1){
        var panelID=params.split('~')[0], skills=parseInt(params.split('~')[1],10), category=categoryById(panelID);
        if(category && category.skills[skills]) loadSkill(category.skills[skills]).then(function(s){$('#skill_'+skills+'_text').html('<p>'+s.text+'</p>');});
    } else {
        var category=categoryById(params); if(category) $('#subjectText').html('<p>'+category.intro.text+'</p>');
    }
}

$.fn.extend({animateCss:function(animationName){var animationEnd='webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';this.addClass('animated '+animationName).one(animationEnd,function(){$(this).removeClass('animated '+animationName);});return this;}});
