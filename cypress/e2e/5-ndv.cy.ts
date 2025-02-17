import { WorkflowPage, NDV } from '../pages';
import { v4 as uuid } from 'uuid';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('NDV', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();

	});
	beforeEach(() => {
		workflowPage.actions.visit();
		workflowPage.actions.renameWorkflow(uuid());
		workflowPage.actions.saveWorkflowOnButtonClick();
	});
	it('should show up when double clicked on a node and close when Back to canvas clicked', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.getters.canvasNodes().first().dblclick();
		ndv.getters.container().should('be.visible');
		ndv.getters.backToCanvas().click();
		ndv.getters.container().should('not.be.visible');
	});

	it('should test webhook node', () => {
		workflowPage.actions.addInitialNodeToCanvas('Webhook');
		workflowPage.getters.canvasNodes().first().dblclick();

		ndv.actions.execute();
		ndv.getters.copyInput().click();

		cy.grantBrowserPermissions('clipboardReadWrite', 'clipboardSanitizedWrite');

		cy.readClipboard().then((url) => {
			cy.request({
				method: 'GET',
				url,
			}).then((resp) => {
				expect(resp.status).to.eq(200);
			});
		});

		ndv.getters.outputDisplayMode().should('have.length.at.least', 1).and('be.visible');
	});

	it('should change input', () => {
		cy.createFixtureWorkflow('NDV-test-select-input.json', `NDV test select input ${uuid()}`);
		workflowPage.actions.zoomToFit();
		workflowPage.getters.canvasNodes().last().dblclick();
		ndv.getters.inputSelect().click();
		ndv.getters.inputOption().last().click();
		ndv.getters.inputDataContainer().find('[class*=schema_]').should('exist')
		ndv.getters.inputDataContainer().should('contain', 'start');
	});

	it('should show correct validation state for resource locator params', () => {
		workflowPage.actions.addNodeToCanvas('Typeform', true, true);
		ndv.getters.container().should('be.visible');
		cy.get('.has-issues').should('have.length', 0);
		cy.get('[class*=hasIssues]').should('have.length', 0);
		ndv.getters.backToCanvas().click();
		// Both credentials and resource locator errors should be visible
		workflowPage.actions.openNode('Typeform');
		cy.get('.has-issues').should('have.length', 1);
		cy.get('[class*=hasIssues]').should('have.length', 1);
	});

	it('should show validation errors only after blur or re-opening of NDV', () => {
		workflowPage.actions.addNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Airtable', true, true, 'Read data from a table');
		ndv.getters.container().should('be.visible');
		cy.get('.has-issues').should('have.length', 0);
		ndv.getters.parameterInput('table').find('input').eq(1).focus().blur();
		ndv.getters.parameterInput('application').find('input').eq(1).focus().blur();
		cy.get('.has-issues').should('have.length', 2);
		ndv.getters.backToCanvas().click();
		workflowPage.actions.openNode('Airtable');
		cy.get('.has-issues').should('have.length', 3);
		cy.get('[class*=hasIssues]').should('have.length', 1);
	});

	it('should show all validation errors when opening pasted node', () => {
		cy.fixture('Test_workflow_ndv_errors.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
			workflowPage.getters.canvasNodes().should('have.have.length', 1);
			workflowPage.actions.openNode('Airtable');
			cy.get('.has-issues').should('have.length', 3);
			cy.get('[class*=hasIssues]').should('have.length', 1);
		});
	});

	describe('test output schema view', () => {
		const schemaKeys = ['id', 'name', 'email', 'notes', 'country', 'created', 'objectValue', 'prop1', 'prop2'];
		beforeEach(() => {
			cy.createFixtureWorkflow('Test_workflow_schema_test.json', `NDV test schema view ${uuid()}`);
			workflowPage.actions.zoomToFit();
			workflowPage.actions.openNode('Set');
			ndv.actions.execute();
		});
		it('should switch to output schema view and validate it', () => {
			ndv.getters.outputDisplayMode().children().should('have.length', 3);
			ndv.getters.outputDisplayMode().find('[class*=active]').should('contain', 'Table');
			ndv.getters.outputDisplayMode().contains('Schema').click();
			ndv.getters.outputDisplayMode().find('[class*=active]').should('contain', 'Schema');

			schemaKeys.forEach((key) => {
				ndv.getters.outputPanel().find('[data-test-id=run-data-schema-item]').contains(key).should('exist');
			});
		});
		it('should preserve schema view after execution', () => {
			ndv.getters.outputDisplayMode().contains('Schema').click();
			ndv.actions.execute();
			ndv.getters.outputDisplayMode().find('[class*=active]').should('contain', 'Schema');
		})
		it('should collapse and expand nested schema object', () => {
			const expandedObjectProps = ['prop1', 'prop2'];;
			const getObjectValueItem = () => ndv.getters.outputPanel().find('[data-test-id=run-data-schema-item]').filter(':contains("objectValue")');
			ndv.getters.outputDisplayMode().contains('Schema').click();

			expandedObjectProps.forEach((key) => {
				ndv.getters.outputPanel().find('[data-test-id=run-data-schema-item]').contains(key).should('be.visible');
			});
			getObjectValueItem().find('label').click();
			expandedObjectProps.forEach((key) => {
				ndv.getters.outputPanel().find('[data-test-id=run-data-schema-item]').contains(key).should('not.be.visible');
			});
		})
	})
});
