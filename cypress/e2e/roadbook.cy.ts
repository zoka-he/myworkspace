describe('roadbook spec', () => {
  it('open main page', () => {
    cy.visit('http://localhost:3000');

    let li1 = cy.get('li.ant-menu-submenu').contains('路书');

    li1.click();

    let li2 = cy.get('li.ant-menu-submenu').contains('计划板');

    li2.click();

    cy.url().should('include', '/roadBook/planBoard');
  })
})