/**
 * Mock module that drop-in replaces `jiraApi.ts` for offline development.
 * `fetchCreateMeta` returns a hardcoded schema instead of hitting Jira;
 * everything else (createIssue, detectApiVersion, types) is re-exported as-is.
 *
 * To use: change the import in App.vue from './services/jiraApi' to './services/jiraApiMock'.
 */

import {
    createIssue,
    detectApiVersion,
    normalizeCreateMeta,
    type JiraApiVersion,
    type JiraConfig,
} from './jiraApi'
import type { JiraCreateMeta } from './jiraTypes'

export { createIssue, detectApiVersion }
export type { JiraApiVersion, JiraConfig }

const MOCK_RAW_RESPONSE = {
    fields: [
        {
            required: false,
            schema: { type: 'user', system: 'assignee' },
            name: 'Assignee',
            fieldId: 'assignee',
            autoCompleteUrl:
                'https://example.internal/rest/api/latest/user/assignable/search?issueKey=null&username=',
            hasDefaultValue: false,
            operations: ['set'],
        },
        {
            required: false,
            schema: { type: 'array', items: 'attachment', system: 'attachment' },
            name: 'Attachment',
            fieldId: 'attachment',
            hasDefaultValue: false,
            operations: [],
        },
        {
            required: true,
            schema: { type: 'array', items: 'component', system: 'components' },
            name: 'Component/s',
            fieldId: 'components',
            hasDefaultValue: false,
            operations: ['add', 'set', 'remove'],
            allowedValues: [
                { self: 'https://example.internal/rest/api/2/component/11400', id: '11400', name: 'Fine Jewelry' },
                { self: 'https://example.internal/rest/api/2/component/11001', id: '11001', name: 'Returns' },
                { self: 'https://example.internal/rest/api/2/component/11000', id: '11000', name: 'Shipping' },
                { self: 'https://example.internal/rest/api/2/component/11503', id: '11503', name: 'Textile Care - U5' },
                { self: 'https://example.internal/rest/api/2/component/10903', id: '10903', name: 'Warehouse' },
            ],
        },
        {
            required: false,
            schema: {
                type: 'array',
                items: 'user',
                custom: 'com.atlassian.servicedesk:sd-request-participants',
                customId: 10000,
            },
            name: 'Anfrageteilnehmer',
            fieldId: 'customfield_10000',
            hasDefaultValue: false,
            operations: ['add', 'set', 'remove'],
        },
        {
            required: false,
            schema: {
                type: 'sd-customerrequesttype',
                custom: 'com.atlassian.servicedesk:vp-origin',
                customId: 10001,
            },
            name: 'Kundenanfragetyp',
            fieldId: 'customfield_10001',
            hasDefaultValue: false,
            operations: ['set'],
        },
        {
            required: false,
            schema: {
                type: 'array',
                items: 'sd-customerorganization',
                custom: 'com.atlassian.servicedesk:sd-customer-organizations',
                customId: 10002,
            },
            name: 'Organisationen',
            fieldId: 'customfield_10002',
            autoCompleteUrl:
                'https://example.internal/rest/servicedesk/1/customer/organisations/project/10801/search?query=',
            hasDefaultValue: false,
            operations: ['add', 'set', 'remove'],
        },
        {
            required: false,
            schema: {
                type: 'string',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
                customId: 10500,
            },
            name: 'Tracking Number',
            fieldId: 'customfield_10500',
            hasDefaultValue: false,
            operations: ['set'],
        },
        {
            required: false,
            schema: {
                type: 'string',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
                customId: 10700,
            },
            name: 'Order Number',
            fieldId: 'customfield_10700',
            hasDefaultValue: false,
            operations: ['set'],
        },
        {
            required: false,
            schema: {
                type: 'string',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
                customId: 11000,
            },
            name: 'P Number',
            fieldId: 'customfield_11000',
            hasDefaultValue: false,
            operations: ['set'],
        },
        {
            required: false,
            schema: {
                type: 'array',
                items: 'option',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes',
                customId: 11001,
            },
            name: 'CC Ticket?',
            fieldId: 'customfield_11001',
            hasDefaultValue: false,
            operations: ['add', 'set', 'remove'],
            allowedValues: [
                {
                    self: 'https://example.internal/rest/api/2/customFieldOption/10909',
                    value: 'yes',
                    id: '10909',
                    disabled: false,
                },
            ],
        },
        {
            required: false,
            schema: {
                type: 'string',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
                customId: 11221,
            },
            name: 'Value',
            fieldId: 'customfield_11221',
            hasDefaultValue: false,
            operations: ['set'],
        },
        {
            required: false,
            schema: {
                type: 'string',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
                customId: 11300,
            },
            name: 'Brand Reference Nr',
            fieldId: 'customfield_11300',
            hasDefaultValue: false,
            operations: ['set'],
        },
        {
            required: false,
            schema: {
                type: 'array',
                items: 'option',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes',
                customId: 11500,
            },
            name: 'PS Ticket?',
            fieldId: 'customfield_11500',
            hasDefaultValue: false,
            operations: ['add', 'set', 'remove'],
            allowedValues: [
                {
                    self: 'https://example.internal/rest/api/2/customFieldOption/10908',
                    value: 'yes',
                    id: '10908',
                    disabled: false,
                },
            ],
        },
        {
            required: false,
            schema: {
                type: 'option',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:select',
                customId: 12301,
            },
            name: 'Carrier',
            fieldId: 'customfield_12301',
            hasDefaultValue: false,
            operations: ['set'],
            allowedValues: [
                { self: 'https://example.internal/rest/api/2/customFieldOption/10904', value: 'DHL Express', id: '10904', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/10905', value: 'DHL Standard', id: '10905', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/10906', value: 'FedEx', id: '10906', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/10907', value: 'UPS', id: '10907', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11711', value: 'Ferrari', id: '11711', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11712', value: 'SDD/NDD', id: '11712', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11713', value: 'Other', id: '11713', disabled: false },
            ],
        },
        {
            required: false,
            schema: {
                type: 'string',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
                customId: 12400,
            },
            name: 'Box Number',
            fieldId: 'customfield_12400',
            hasDefaultValue: false,
            operations: ['set'],
        },
        {
            required: true,
            schema: {
                type: 'option',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:select',
                customId: 12800,
            },
            name: 'Customer Group List',
            fieldId: 'customfield_12800',
            hasDefaultValue: false,
            operations: ['set'],
            allowedValues: [
                { self: 'https://example.internal/rest/api/2/customFieldOption/11403', value: 'PSH', id: '11403', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11404', value: 'Top Customer', id: '11404', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11405', value: 'Standard', id: '11405', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11406', value: 'Other', id: '11406', disabled: false },
            ],
        },
        {
            required: false,
            schema: {
                type: 'option',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:select',
                customId: 12903,
            },
            name: 'Type of "Personal Shopping"',
            fieldId: 'customfield_12903',
            hasDefaultValue: false,
            operations: ['set'],
            allowedValues: [
                { self: 'https://example.internal/rest/api/2/customFieldOption/11522', value: 'US', id: '11522', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11523', value: 'EU', id: '11523', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11524', value: 'others', id: '11524', disabled: false },
            ],
        },
        {
            required: true,
            schema: {
                type: 'option',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:select',
                customId: 12907,
            },
            name: 'Type of "Quality Issue"',
            fieldId: 'customfield_12907',
            hasDefaultValue: false,
            operations: ['set'],
            allowedValues: [
                { self: 'https://example.internal/rest/api/2/customFieldOption/11556', value: 'Broken Box', id: '11556', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11538', value: 'Damaged Item', id: '11538', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11557', value: 'Dirty', id: '11557', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11537', value: 'Missing Part', id: '11537', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11555', value: 'Scratched Soles', id: '11555', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11540', value: 'Wrong Item / Wrong Labeled', id: '11540', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11541', value: 'Other', id: '11541', disabled: false },
            ],
        },
        {
            required: false,
            schema: {
                type: 'option',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons',
                customId: 12911,
            },
            name: 'Order Type',
            fieldId: 'customfield_12911',
            hasDefaultValue: false,
            operations: ['set'],
            allowedValues: [
                { self: 'https://example.internal/rest/api/2/customFieldOption/11560', value: 'SIO (Single Item Order)', id: '11560', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11561', value: 'MIO (Multiple Item Order)', id: '11561', disabled: false },
            ],
        },
        {
            required: false,
            schema: {
                type: 'string',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
                customId: 13100,
            },
            name: 'EAN',
            fieldId: 'customfield_13100',
            hasDefaultValue: false,
            operations: ['set'],
        },
        {
            required: false,
            schema: {
                type: 'option',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:select',
                customId: 13304,
            },
            name: 'Refund Status',
            fieldId: 'customfield_13304',
            hasDefaultValue: true,
            operations: ['set'],
            allowedValues: [
                { self: 'https://example.internal/rest/api/2/customFieldOption/11921', value: 'None/waiting for manual change', id: '11921', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11922', value: 'Refunded', id: '11922', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11923', value: 'Partial Refund', id: '11923', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/11924', value: 'No Refund', id: '11924', disabled: false },
            ],
            defaultValue: {
                self: 'https://example.internal/rest/api/2/customFieldOption/11921',
                value: 'None/waiting for manual change',
                id: '11921',
                disabled: false,
            },
        },
        {
            required: false,
            schema: {
                type: 'string',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
                customId: 13500,
            },
            name: 'Serial Nr',
            fieldId: 'customfield_13500',
            hasDefaultValue: false,
            operations: ['set'],
        },
        {
            required: false,
            schema: {
                type: 'string',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
                customId: 13501,
            },
            name: 'Warranty Nr',
            fieldId: 'customfield_13501',
            hasDefaultValue: false,
            operations: ['set'],
        },
        {
            required: false,
            schema: {
                type: 'option',
                custom: 'com.atlassian.jira.plugin.system.customfieldtypes:select',
                customId: 13502,
            },
            name: 'Activation Status',
            fieldId: 'customfield_13502',
            hasDefaultValue: false,
            operations: ['set'],
            allowedValues: [
                { self: 'https://example.internal/rest/api/2/customFieldOption/12107', value: 'None', id: '12107', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/12108', value: 'Activated', id: '12108', disabled: false },
                { self: 'https://example.internal/rest/api/2/customFieldOption/12109', value: 'Deactivated', id: '12109', disabled: false },
            ],
        },
        {
            required: false,
            schema: { type: 'string', system: 'description' },
            name: 'Description',
            fieldId: 'description',
            hasDefaultValue: false,
            operations: ['set'],
        },
        {
            required: false,
            schema: { type: 'array', items: 'issuelinks', system: 'issuelinks' },
            name: 'Linked Issues',
            fieldId: 'issuelinks',
            autoCompleteUrl:
                'https://example.internal/rest/api/2/issue/picker?currentProjectId=&showSubTaskParent=true&showSubTasks=true&currentIssueKey=null&query=',
            hasDefaultValue: false,
            operations: ['add'],
        },
        {
            required: false,
            schema: { type: 'issuetype', system: 'issuetype' },
            name: 'Issue Type',
            fieldId: 'issuetype',
            hasDefaultValue: false,
            operations: [],
            allowedValues: [
                {
                    self: 'https://example.internal/rest/api/2/issuetype/11800',
                    id: '11800',
                    description: '',
                    iconUrl:
                        'https://example.internal/secure/viewavatar?size=xsmall&avatarId=10309&avatarType=issuetype',
                    name: 'quality issue',
                    subtask: false,
                    avatarId: 10309,
                },
            ],
        },
        {
            required: false,
            schema: { type: 'array', items: 'string', system: 'labels' },
            name: 'Labels',
            fieldId: 'labels',
            autoCompleteUrl: 'https://example.internal/rest/api/1.0/labels/suggest?query=',
            hasDefaultValue: false,
            operations: ['add', 'set', 'remove'],
        },
        {
            required: true,
            schema: { type: 'project', system: 'project' },
            name: 'Project',
            fieldId: 'project',
            hasDefaultValue: false,
            operations: ['set'],
            allowedValues: [
                {
                    self: 'https://example.internal/rest/api/2/project/10801',
                    id: '10801',
                    key: 'LSR',
                    name: 'LEJ Shipping and Returns',
                    projectTypeKey: 'service_desk',
                    avatarUrls: {
                        '48x48': 'https://example.internal/secure/projectavatar?pid=10801&avatarId=10211',
                        '24x24': 'https://example.internal/secure/projectavatar?size=small&pid=10801&avatarId=10211',
                        '16x16': 'https://example.internal/secure/projectavatar?size=xsmall&pid=10801&avatarId=10211',
                        '32x32': 'https://example.internal/secure/projectavatar?size=medium&pid=10801&avatarId=10211',
                    },
                },
            ],
        },
        {
            required: false,
            schema: { type: 'user', system: 'reporter' },
            name: 'Reporter',
            fieldId: 'reporter',
            autoCompleteUrl: 'https://example.internal/rest/api/latest/user/search?username=',
            hasDefaultValue: false,
            operations: ['set'],
        },
        {
            required: true,
            schema: { type: 'string', system: 'summary' },
            name: 'Summary',
            fieldId: 'summary',
            hasDefaultValue: false,
            operations: ['set'],
        },
    ],
}

export async function fetchCreateMeta(_url: string, _config: JiraConfig): Promise<JiraCreateMeta> {
    // simulate a small network delay
    await new Promise(r => setTimeout(r, 200))
    console.log('[jiraApiMock] returning mock schema with', MOCK_RAW_RESPONSE.fields.length, 'fields')
    return normalizeCreateMeta(MOCK_RAW_RESPONSE)
}
