import React, { useRef, useState, useEffect, } from "react";
import { useHistory, useParams } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import ReactPlayer from 'react-player/lazy'
import $ from "jquery";

import React360Viewer from "@/components/360/React360Viewer.js";

// @material-ui/core components

// core components
import GridContainer from "@/components/Grid/GridContainer.js";
import GridItem from "@/components/Grid/GridItem.js";
import Button from "@/components/CustomButtons/Button.js";
import Card from "@/components/Card/Card.js";
import CardBody from "@/components/Card/CardBody.js";

import SweetAlert from "react-bootstrap-sweetalert";

import sampleThumbnail from "@/assets/img/sample-thumbnail.jpg";

// styles
import { makeStyles } from "@material-ui/core/styles";
import styles from "@/assets/jss/material-dashboard-pro-react/views/commonPageStyle.js";
const useStyles = makeStyles(styles);
// import css from "@/assets/scss/test.scss";

// actions
import { LogoutAction } from '@/redux/actions/AuthActions';
import { 
    GetCategoryNameService, 
    GetRaritiesService, 
    GetObjectCategoriesService,
    GetTokenInformationService,
} from '@/services/UserServices';

// contract
import { useUmblCoreContract, useMarketPlaceContract } from "@/hooks";

export default function ItemPage() {
    const history = useHistory();
    const { category, tokenId } = useParams();
    const classes = useStyles();
    const dispatch = useDispatch();
    const targetRef = useRef();

    const umblCoreContract = useUmblCoreContract();

    // redux state variables
    const { isAuthenticated, isAdmin, } = useSelector((state) => state.userAuth);
    const { status, account, } = useSelector((state) => state.userWallet);

    // local state variables
    const [alert, setAlert] = React.useState(null);
    const [categoryId, setCategoryId] = React.useState(null);
    const [categoryName, setCategoryName] = React.useState('');
    const [accountError, setAccountError] = React.useState(false);
    const [tokenName, setTokenName] = React.useState('');
    const [tokenDescription, setTokenDescription] = React.useState('');
    const [tokenModel, setTokenModel] = React.useState('');
    const [tokenV360, setTokenV360] = React.useState(null);
    const [tokenThumbnail, setTokenThumbnail] = React.useState(null);
    const [tokenRarity, setTokenRarity] = React.useState('');
    const [tokenRarityId, setTokenRarityId] = React.useState(null);
    const [tokenCategory, setTokenCategory] = React.useState('');
    const [tokenCategoryId, setTokenCategoryId] = React.useState(null);
    const [tokenAttributes, setTokenAttributes] = React.useState([]);
    const [tokenHealth, setTokenHealth] = React.useState(null);

    useEffect(() => {
        if(isAdmin && isAuthenticated) {
            history.push('/admin');
        }
        if(!isAuthenticated) {
            dispatch(LogoutAction(history));
        }
    }, [isAdmin, isAuthenticated]); 
    
    useEffect(() => {
        if(category === 'weapons') setCategoryId(1);
        else if(category === 'armor') setCategoryId(2);
        else if(category === 'accesories') setCategoryId(3);
        else if(category === 'virus') setCategoryId(4);
        else if(category === 'paracites') setCategoryId(5);
        else if(category === 'variants') setCategoryId(6);
        else if(category === 'plots') setCategoryId(7);
        else history.push('/inventory');    
        
        if(!status) {
            showErrorMsg('You must connect Metamask');
        }
    }, []);

    useEffect(() => {
        if(categoryId) {
            GetCategoryNameService({categoryId: categoryId}).then(res => {
                if(res.hasOwnProperty('success') && res.success === true) {
                    setCategoryName(res.category);
                } else {
                    if(res.error === 'token') {
                        dispatch(LogoutAction(history));
                    }
                }
            })
        }
    }, [categoryId]);

    useEffect( async () => {
        if(status && account) {
            if (!umblCoreContract) {
                return;
            } 
          
            const tokenContractData = await umblCoreContract.methods
                .tokenUmblData(tokenId)
                .call({ from: account })
                .catch(err => {
                    history.push('/inventory');
                });

            // console.log(tokenContractData);

            if(tokenContractData.owner.toLowerCase() !== account.toLowerCase()) {
                setAccountError(true);
                showErrorMsg('This token is owend by other account.');
                return;
            }
            
            let tokenURI = await umblCoreContract.methods
                .uri(tokenId)
                .call({ from: account });

            // console.log('Token URI => ' + tokenURI);
            // let replacedTokenUri1 = tokenURI.replace(".cc", ".localhost");
            // let replacedTokenUri2 = replacedTokenUri1.replace("https", "http");

            let response = await fetch(tokenURI);
            let responseJson = await response.json();

            setTokenName(responseJson.name);
            setTokenDescription(responseJson.description);
            setTokenThumbnail(responseJson.image);
            setTokenModel(responseJson.model);
            setTokenAttributes(responseJson.attributes);

            let tokenData = await umblCoreContract.methods
                .tokenUmblData(tokenId)
                .call({ from: account })
                .catch(err => {
                    history.push('/inventory');
                });

            console.log(tokenData);

            setTokenRarityId(parseInt(tokenData.rarity));

            GetRaritiesService()
            .then(res => {
                const rarity = res.rarities.find(element => element.id === parseInt(tokenData.rarity));
                if(rarity === undefined)
                    setTokenRarity('');
                else
                    setTokenRarity(rarity.name);
            });

            setTokenCategoryId(tokenData.category);
            GetObjectCategoriesService()
            .then(res => {
                const category = res.categories.find(element => element.id === parseInt(tokenData.category));
                if(category === undefined)
                    setTokenCategory('');   
                else 
                    setTokenCategory(category.name);
            });

            setTokenHealth(tokenData.health);

            GetTokenInformationService(tokenId)
            .then(res => {
                if(res.hasOwnProperty('success') && res.success === true) {
                    setTokenV360(res.object.preset.v360);                    
                }
            });
        }
    }, [status, account])

    useEffect(() => {
        if(tokenV360 !== null && tokenV360 !== '' && categoryId !== 7 && tokenV360.search('.mview') > 0) {
            var width = 256;
            if (targetRef.current) {
                width = targetRef.current.offsetWidth;
            }            

            var fileUrl = process.env.MIX_UMBL_STORAGE_URI + 'objects/' + tokenV360;
            var myviewer = new window.marmoset.WebViewer( width, width/2, fileUrl );
            $("#mviewer_container").append(myviewer.domRoot);
            myviewer.loadScene();
        }

    }, [tokenV360])

    const handleBack = () => {
        history.push('/inventory/' + category);
    };

    // sweet alert functions
    const hideAlert = () => {
        setAlert(null);
    };

    const handleClick = (tokenId) => {
        history.push('/inventory/' + category + '/' + tokenId);
    };

    const showErrorMsg = (message) => {
        setAlert(
          <SweetAlert
            closeOnClickOutside={false}
            style={{ display: "block", marginTop: "-100px" }}
            title="Error!"
            onConfirm={() => hideAlert()}
            onCancel={() => hideAlert()}
            confirmBtnCssClass={classes.button + " " + classes.info}
            customClass="blackMsg"
          >
            {message}
          </SweetAlert>
        );
    };    
    
    const showString = (msg) => {
        const length_limit = 14;
        return msg.length > length_limit ? msg.substring(0, length_limit - 3) + '...' : msg;
    }

    const getRarityColor = (rarity) => {
        if(rarity === 1) return '#cfd8dc';
        else if(rarity === 2) return '#00ff00';
        else if(rarity === 3) return '#0000ff';
        else if(rarity === 4) return '#004d40';
        else if(rarity === 5) return '#2962ff';
        else if(rarity === 6) return '#aa00ff';
        else if(rarity === 7) return '#c51162';
        return '#ffffff';
    };

    const getRarityMarker = (rarity) => {
        if(rarity === 1) return 'C';
        else if(rarity === 2) return 'U';
        else if(rarity === 3) return 'N';
        else if(rarity === 4) return 'R';
        else if(rarity === 5) return 'E';
        else if(rarity === 6) return 'L';
        else if(rarity === 7) return 'M';
        return 'K';
    };

    return(
        <div className={classes.container}> 
            { !accountError ? (
            <GridContainer justifyContent="center">
                <GridItem xs={12} sm={12} md={12}>
                    <Card transparent>
                        <CardBody>
                            <div ref={targetRef} className="lightBlueLink" onClick={handleBack} style={{marginBottom: "30px"}}>
                                back
                            </div>
                            { tokenName !== '' ? (
                                <div>
                                    <div className="whiteTitleText">
                                        { tokenName === '' ? '          ' : tokenName }
                                    </div> 
                                    <div className="bottomAttributes">
                                        <div className="categorySmallText">
                                            {tokenCategory === '' ? '          ' : tokenCategory }
                                        </div> 
                                        <div className="raritySmallText" style={{color: getRarityColor(tokenRarityId)}}>
                                            {tokenRarity === '' ? '' : '(' + tokenRarity + ')'}
                                        </div>
                                    </div>
                                    <div className="itemDescText">
                                        {tokenDescription}
                                    </div>  
                                    <div className="itemImage">
                                        { tokenV360 !== null && tokenV360 !== '' ? categoryId === 7 && tokenV360.search('.mp4') !== -1 ?
                                            // (<React360Viewer
                                            //     amount={72}
                                            //     imagePath={process.env.MIX_UMBL_CLOUDIMAGE_URI + 'objects/' + tokenV360 + '/xxxx?func=crop&width=540&height=540'}
                                            //     fileName="{index}.png"
                                            //     spinReverse
                                            //     autoplay
                                            //     loop
                                            //     buttonClass="dark"
                                            // />) :
                                            (<ReactPlayer 
                                                url={process.env.MIX_UMBL_STORAGE_URI + 'plots/' + tokenV360}
                                                playing={true} 
                                                loop={true} 
                                                width='100%'
                                                height='100%'/>) :
                                            (<div id="mviewer_container"></div>) :
                                            (<img src={tokenThumbnail === null ? sampleThumbnail : tokenThumbnail} />)
                                        }
                                    </div>
                                </div>
                            ) : null }                                                 
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem xs={12} sm={12} md={12}>
                    <Card transparent>
                        <CardBody>
                            <div className="itemAttributeBlock">
                                <div className="blockTitle">Attributes</div>
                                <div className="attributeTable">
                                    <table className="table-attribute">
                                        <tbody>
                                            <tr>
                                                <td className="key">Health</td>
                                                <td className="value">{tokenHealth}</td>
                                            </tr>
                                        { tokenAttributes.map((prop, key) => {
                                            return (
                                                <tr key={key}>
                                                    <td className="key">{prop.trait_type}</td>
                                                    <td className="value">{prop.value}</td>
                                                </tr>
                                            )
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </GridItem>
            </GridContainer>
            ) : null }
        </div>
    );
};