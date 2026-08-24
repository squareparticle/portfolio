async function initAbout(){
    var about = await PortfolioResources.loadPageJson('aboutme');
    $('#aboutImage').attr('src', PortfolioResources.asset(about.image,about._resourceBase));
    $('#aboutHeadline').text(about.headline || '');
    var holder=$('#aboutSections').empty();
    $.each(about.sections || [], function(_,section){
        var container=$('<div>',{'class':'container'});
        var jumbo=$('<div>',{'class':'jumbotron'}).css({'padding-top':'10px','padding-bottom':'10px'});
        jumbo.append($('<h2>').text(section.title));
        var outer=$('<ul>',{'class':'list-unstyled'}), li=$('<li>'), inner=$('<ul>');
        $.each(section.items || [],function(_,item){inner.append($('<li>').text(item));});
        li.append(inner); outer.append(li); jumbo.append(outer); container.append(jumbo); holder.append(container);
    });
}
